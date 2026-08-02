// Netlify Function: Safety Incident Reader (institution side)
// ─────────────────────────────────────────────────────────────────────
// safety_incidents is locked to the service role — no client can read it
// with an anon/user JWT, by design, because the device account belongs to
// the caretaker (see supabase_safety_incidents_lockdown.sql).
//
// This is the one sanctioned read path. It answers only for the assigned
// teacher/clinician: the caller proves who they are with their own Supabase
// access token, and we return incidents only for profiles whose
// teacher_email matches that verified email. The caretaker's device account
// is never the assigned teacher, so it can never reach these rows here.
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const svc = {
  apikey:        SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const origin = event.headers.origin || '';
  const allowed = ['https://speakaac.org', 'https://www.speakaac.org'];
  if (!allowed.includes(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 503, body: 'Not configured' };
  }

  // 1. Verify the caller. The token is checked by Supabase, not trusted from
  //    the body — the caller cannot claim to be someone else.
  const auth = event.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { statusCode: 401, body: 'Missing token' };

  let email;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { statusCode: 401, body: 'Invalid token' };
    email = (await r.json()).email;
  } catch {
    return { statusCode: 401, body: 'Invalid token' };
  }
  if (!email) return { statusCode: 401, body: 'No email on account' };

  try {
    // 2. Which profiles is this person actually the assigned teacher for?
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?teacher_email=eq.${encodeURIComponent(email)}&select=user_id`,
      { headers: svc }
    );
    const profiles = pRes.ok ? await pRes.json() : [];
    const ids = profiles.map(p => p.user_id).filter(Boolean);
    if (!ids.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidents: [] }),
      };
    }

    // 3. Incidents for those profiles only.
    const list = ids.map(encodeURIComponent).join(',');
    const iRes = await fetch(
      `${SUPABASE_URL}/rest/v1/safety_incidents?user_id=in.(${list})&order=ts.desc&limit=200`,
      { headers: svc }
    );
    const incidents = iRes.ok ? await iRes.json() : [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidents }),
    };
  } catch (err) {
    console.error('Incident read error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
