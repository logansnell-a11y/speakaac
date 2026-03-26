// Netlify Function: AI Sentence Builder proxy
// ────────────────────────────────────────────────────────────────────
// Security model:
//   - Unauthenticated requests: strict IP-based lifetime cap (no account = 3 uses)
//   - Authenticated free tier: 5 AI sentences/day, enforced server-side in Supabase
//   - Authenticated paid tiers (family, clinic, institution): unlimited
//   - All usage logged to ai_usage table for monitoring + cost tracking
//   - ANTHROPIC_API_KEY never leaves the server
// ────────────────────────────────────────────────────────────────────

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY       = process.env.ANTHROPIC_API_KEY;

const PAID_TIERS  = ['family', 'clinic', 'institution'];
const FREE_DAILY_LIMIT = 10;
const ANON_LIFETIME_LIMIT = 3;

// ── Content safety ───────────────────────────────────────────────────
const BLOCKLIST = [
  'kill','murder','suicide','rape','porn','naked','sex',
  'fuck','shit','ass','bitch','nigger','faggot','cunt','bastard',
];
function containsBlocked(text) {
  const words = text.toLowerCase().split(/\W+/);
  return BLOCKLIST.some(w => words.includes(w));
}

// ── Anon IP tracker — persisted in Supabase (survives cold starts) ───

// ── Supabase helpers (pure fetch — no npm needed) ────────────────────
async function verifySupabaseJWT(jwt) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
  });
  if (!res.ok) return null;
  return res.json(); // { id, email, ... }
}

async function getUserTier(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=settings`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    }
  );
  if (!res.ok) return 'free';
  const rows = await res.json();
  return rows[0]?.settings?.tier || 'free';
}

async function getTodayUsageCount(userId) {
  const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${todayUTC}T00:00:00Z&select=id`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    }
  );
  if (!res.ok) return 0;
  const rows = await res.json();
  return rows.length;
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
      user_id:     userId || null,
      ip:          userId ? null : ip, // only store IP for anon users
      words_count: wordsCount,
      tier:        tier,
    }),
  });
}

async function getAnonLifetimeCount(ip) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_usage?user_id=is.null&ip=eq.${encodeURIComponent(ip)}&select=id`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    }
  );
  if (!res.ok) return 0;
  const rows = await res.json();
  return rows.length;
}

// ── Main handler ─────────────────────────────────────────────────────
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();

  // ── Parse + validate request body ──────────────────────────────────
  let words;
  try {
    words = JSON.parse(event.body || '{}').words;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!Array.isArray(words) || words.length < 1 || words.length > 20) {
    return { statusCode: 400, body: JSON.stringify({ error: 'words must be an array of 1–20 items' }) };
  }

  const cleaned = words
    .map(w => String(w).replace(/[^\w\s'.,!?-]/g, '').trim())
    .filter(Boolean)
    .slice(0, 20);

  if (cleaned.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No valid words provided' }) };
  }

  // Safety: blocklist input — return a safe fallback silently
  if (cleaned.some(w => containsBlocked(w))) {
    return {
      statusCode: 200,
      body: JSON.stringify({ sentence: 'I would like ' + cleaned.join(', ') + '.' }),
    };
  }

  // ── Auth & tier enforcement ─────────────────────────────────────────
  const authHeader = event.headers['authorization'] || '';
  const jwt        = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let userId = null;
  let tier   = 'anon';

  if (!jwt) {
    // Unauthenticated — lifetime cap per IP, enforced in Supabase (persists across cold starts)
    const anonCount = await getAnonLifetimeCount(ip);
    if (anonCount >= ANON_LIFETIME_LIMIT) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Create a free account to keep using AI sentences.',
          limitReached: true,
        }),
      };
    }
  } else {
    // Verify Supabase JWT
    const user = await verifySupabaseJWT(jwt);
    if (!user || !user.id) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Session expired — please sign in again.' }) };
    }
    userId = user.id;
    tier   = await getUserTier(userId);

    if (!PAID_TIERS.includes(tier)) {
      // Free tier — 5/day server-enforced
      const usedToday = await getTodayUsageCount(userId);
      if (usedToday >= FREE_DAILY_LIMIT) {
        return {
          statusCode: 429,
          body: JSON.stringify({
            error: `You've used your ${FREE_DAILY_LIMIT} free AI sentences for today. Upgrade to Family for unlimited.`,
            limitReached: true,
            used: usedToday,
            limit: FREE_DAILY_LIMIT,
          }),
        };
      }
    }
  }

  // ── Call Claude Haiku ───────────────────────────────────────────────
  if (!ANTHROPIC_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'AI service temporarily unavailable' }) };
  }

  const prompt =
    `A nonverbal person using an AAC communication app tapped these symbols in order: ` +
    `"${cleaned.join(', ')}". Write one clear, natural, first-person sentence that captures ` +
    `what they're most likely trying to express. Return ONLY the sentence with no explanation.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      throw new Error(`Anthropic ${res.status}`);
    }

    const data = await res.json();
    let sentence = (data.content?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');

    // Output safety check
    if (!sentence || containsBlocked(sentence)) {
      sentence = 'I would like ' + cleaned.join(', ') + '.';
    }

    // Log usage (fire and forget — don't block the response)
    logUsage({ userId, ip, wordsCount: cleaned.length, tier }).catch(e =>
      console.error('Usage log failed:', e)
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence }),
    };

  } catch (e) {
    console.error('ai-sentence handler error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not build sentence — please try again.' }),
    };
  }
};
