// Netlify Function: Generative Vocabulary ("Say something that isn't here")
// ────────────────────────────────────────────────────────────────────
// Purpose: the user (or caregiver) gives a short context/seed and we
// GENERATE a small set of new candidate buttons they can immediately pick
// from — opening NEW communication without pre-programming or deep menu
// navigation. This is generative (creates new options), NOT the sentence
// builder (which only smooths existing taps).
//
// Mirrors ai-sentence.js exactly:
//   - ANTHROPIC_API_KEY never leaves the server
//   - anon IP lifetime cap / free daily cap / paid unlimited
//   - usage logged to ai_usage for cost tracking
//   - input + output content safety
//
// CONTENT POLICY: no word blocklist. The users are nonverbal people saying
// real things — censoring their vocabulary (incl. abuse disclosure, sex, body
// parts, swearing) is ableist and silences the kids this app exists to protect.
// The real backstop is the model itself (Claude is safety-trained, won't
// produce slurs/CSAM from a benign AAC prompt) + the rate limits below, which
// stop anonymous API abuse far better than a keyword list ever could.
// ────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY        = process.env.ANTHROPIC_API_KEY;

const PAID_TIERS          = ['family', 'clinic', 'institution'];
const FREE_DAILY_LIMIT    = 10;
const ANON_LIFETIME_LIMIT = 3;
const MAX_BUTTONS         = 12;

// ── Supabase helpers (pure fetch — no npm needed) ────────────────────
async function verifySupabaseJWT(jwt) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_SERVICE_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}
async function getUserTier(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=settings`,
    { headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY } }
  );
  if (!res.ok) return 'free';
  const rows = await res.json();
  return rows[0]?.settings?.tier || 'free';
}
async function getTodayUsageCount(userId) {
  const todayUTC = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${todayUTC}T00:00:00Z&select=id`,
    { headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY } }
  );
  if (!res.ok) return 0;
  return (await res.json()).length;
}
async function getAnonLifetimeCount(ip) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_usage?user_id=is.null&ip=eq.${encodeURIComponent(ip)}&select=id`,
    { headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY } }
  );
  if (!res.ok) return 0;
  return (await res.json()).length;
}
async function logUsage({ userId, ip, wordsCount, tier }) {
  await fetch(`${SUPABASE_URL}/rest/v1/ai_usage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId || null,
      ip: userId ? null : ip,
      words_count: wordsCount,
      tier: tier,
    }),
  });
}

// ── CORS ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = 'https://speakaac.org';
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// ── Main handler ─────────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers['origin'] || '';
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();

  // ── Parse + validate ───────────────────────────────────────────────
  let context, lang, ageBand;
  try {
    const body = JSON.parse(event.body || '{}');
    context = String(body.context || '').trim();
    lang    = body.lang === 'es' ? 'es' : 'en';
    // ageBand is non-identifying ("child" | "teen" | "adult") — set by caregiver profile, never the child's data
    ageBand = ['child', 'teen', 'adult'].includes(body.ageBand) ? body.ageBand : 'any';
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!context || context.length < 1 || context.length > 200) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'context must be 1–200 chars' }) };
  }

  // ── Auth & tier enforcement (identical to ai-sentence) ─────────────
  const authHeader = event.headers['authorization'] || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let userId = null, tier = 'anon';

  if (!jwt) {
    if (await getAnonLifetimeCount(ip) >= ANON_LIFETIME_LIMIT) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Create a free account to keep generating words.', limitReached: true }) };
    }
  } else {
    const user = await verifySupabaseJWT(jwt);
    if (!user || !user.id) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session expired — please sign in again.' }) };
    userId = user.id;
    tier = await getUserTier(userId);
    if (!PAID_TIERS.includes(tier)) {
      const usedToday = await getTodayUsageCount(userId);
      if (usedToday >= FREE_DAILY_LIMIT) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: `You've used your ${FREE_DAILY_LIMIT} free AI actions today. Upgrade to Family for unlimited.`, limitReached: true, used: usedToday, limit: FREE_DAILY_LIMIT }) };
      }
    }
  }

  if (!ANTHROPIC_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI service temporarily unavailable' }) };
  }

  // ── Build prompt ────────────────────────────────────────────────────
  const ageNote = ageBand === 'any' ? '' : ` The user is a ${ageBand}; keep words age-appropriate.`;
  const langNote = lang === 'es' ? ' Return the words in Spanish.' : '';
  const prompt =
    `A nonverbal person using an AAC app wants to say something that isn't on their board yet. ` +
    `Their starting idea or context is: "${context}".${ageNote} ` +
    `Return a JSON object {"buttons": [...]} with 9 short vocabulary items (1–2 words each) that best help them ` +
    `express themselves here: a mix of actions/needs, feelings, people, places, or things relevant to the context, ` +
    `plus at least 2 high-frequency core words ("want","more","stop","help","go","no") useful for building sentences. ` +
    `If the context suggests pain, fear, or danger, include relevant words like "help","hurt","stop","scared","who","where". ` +
    `Use simple, first-person-friendly words.${langNote} Return ONLY the JSON object, no markdown.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error('Anthropic API error:', res.status, await res.text());
      throw new Error(`Anthropic ${res.status}`);
    }

    const data = await res.json();
    const raw = (data.content?.[0]?.text || '').trim().replace(/^```json\s*|\s*```$/g, '');

    let buttons = [];
    try {
      const parsed = JSON.parse(raw);
      buttons = Array.isArray(parsed.buttons) ? parsed.buttons : [];
    } catch {
      // model didn't return clean JSON — fall back to comma/line split
      buttons = raw.split(/[,\n]/).map(s => s.replace(/["\[\]{}]/g, ''));
    }

    buttons = buttons
      .map(b => String(b).replace(/[^\w\s'-]/g, '').trim().toLowerCase())
      .filter(Boolean)
      .filter((b, i, arr) => arr.indexOf(b) === i) // dedupe
      .slice(0, MAX_BUTTONS);

    if (buttons.length === 0) buttons = ['help', 'yes', 'no', 'more', 'stop', 'please'];

    logUsage({ userId, ip, wordsCount: buttons.length, tier }).catch(e => console.error('Usage log failed:', e));

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ buttons }),
    };
  } catch (e) {
    console.error('generate-vocab handler error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not generate words — please try again.' }) };
  }
};
