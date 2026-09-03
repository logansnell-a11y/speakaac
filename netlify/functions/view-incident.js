// Netlify Function: Incident Viewer (trusted-contact side)
// ─────────────────────────────────────────────────────────────────────
// The second tier of the two-tier alert.
//
// The alert email carries only an incident reference and a signed link.
// This endpoint trades that link's token for the incident content. Resend,
// EmailJS, and any SMS carrier only ever see the reference and the token —
// never a name, a reason, or the user's message.
//
// Why a signed token and not an account: the trusted contact is often just
// an email address in a settings screen. Requiring them to register would
// break the channel for exactly the people it exists for.
//
// The token is an HMAC over "<incidentId>.<expiry>" — unforgeable without
// INCIDENT_LINK_SECRET, and it names one incident only.
// ─────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LINK_SECRET          = process.env.INCIDENT_LINK_SECRET;

const b64u = buf => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  let payload;
  try { payload = unb64u(parts[0]).toString('utf8'); } catch { return null; }

  const expected = b64u(crypto.createHmac('sha256', LINK_SECRET).update(payload).digest());

  // Constant-time compare. Length check first, because timingSafeEqual throws
  // on a length mismatch and that throw is itself a timing signal.
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  const [incidentId, expStr] = payload.split('.');
  const exp = parseInt(expStr, 10);
  if (!incidentId || !Number.isFinite(exp)) return null;
  if (Date.now() / 1000 > exp) return { expired: true };

  return { incidentId };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const origin = event.headers.origin || '';
  const allowed = ['https://speakaac.org', 'https://www.speakaac.org'];
  if (!allowed.includes(origin)) return { statusCode: 403, body: 'Forbidden' };

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !LINK_SECRET) {
    console.error('view-incident: missing env config');
    return { statusCode: 503, body: 'Not configured' };
  }

  let token;
  try { token = JSON.parse(event.body).token; } catch { return { statusCode: 400, body: 'Bad request' }; }

  const v = verify(token);
  if (!v) return { statusCode: 403, body: JSON.stringify({ error: 'invalid' }) };
  if (v.expired) {
    return {
      statusCode: 410,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'expired' }),
    };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/safety_incidents` +
      `?incident_id=eq.${encodeURIComponent(v.incidentId)}` +
      `&select=incident_id,user_name,reason_label,message_at_time,ts&limit=1`,
      {
        headers: {
          apikey:        SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ incident: rows[0] }),
    };
  } catch (err) {
    console.error('view-incident error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
