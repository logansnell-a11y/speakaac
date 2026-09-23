// Netlify Function: claim a parked Stripe upgrade
// ─────────────────────────────────────────────────────────────────────
// Stripe payment links accept any email. When someone pays with an email
// that has no Speak account yet, stripe-webhook parks the tier in
// pending_upgrades instead of dropping it. This applies that tier the
// first time they sign in.
//
// The caller's email is resolved from their JWT server-side. A client
// supplied email is never trusted, because trusting it would let anyone
// claim any tier by typing someone else's address.
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const svc = {
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'apikey':        SUPABASE_SERVICE_KEY,
  'Content-Type':  'application/json',
};

async function getUserFromJwt(jwt) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_SERVICE_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

// Tier order matters: if someone parked more than one upgrade we apply the
// best one rather than whichever happened to be inserted last.
const RANK = { free: 0, family: 1, clinic: 2, institution: 3, facility: 4, lifetime: 5 };

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const jwt  = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return { statusCode: 401, body: JSON.stringify({ error: 'No token' }) };

  const user = await getUserFromJwt(jwt);
  if (!user || !user.id || !user.email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const email = user.email.toLowerCase();

  // Any upgrades parked for this address and not yet claimed
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/pending_upgrades?email=eq.${encodeURIComponent(email)}` +
    `&claimed_at=is.null&select=id,tier`,
    { headers: svc }
  );
  if (!listRes.ok) {
    // Table missing or unreachable. Not worth failing a sign-in over.
    return { statusCode: 200, body: JSON.stringify({ claimed: false }) };
  }
  const rows = await listRes.json();
  if (!rows.length) return { statusCode: 200, body: JSON.stringify({ claimed: false }) };

  const best = rows.reduce((a, b) => ((RANK[b.tier] ?? -1) > (RANK[a.tier] ?? -1) ? b : a));

  // Merge the tier into the existing profile rather than replacing settings
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=settings`,
    { headers: svc }
  );
  const current = profRes.ok ? (((await profRes.json())[0] || {}).settings || {}) : {};

  const upRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...svc, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id:    user.id,
      settings:   { ...current, tier: best.tier },
      updated_at: new Date().toISOString(),
    }),
  });
  if (!upRes.ok) {
    return { statusCode: 200, body: JSON.stringify({ claimed: false }) };
  }

  // Mark every row for this address claimed, so a second sign-in is a no-op
  await fetch(
    `${SUPABASE_URL}/rest/v1/pending_upgrades?email=eq.${encodeURIComponent(email)}&claimed_at=is.null`,
    {
      method: 'PATCH',
      headers: svc,
      body: JSON.stringify({ claimed_at: new Date().toISOString(), claimed_by: user.id }),
    }
  );

  console.log(`Claimed parked upgrade tier=${best.tier} for user=${user.id}`);
  return { statusCode: 200, body: JSON.stringify({ claimed: true, tier: best.tier }) };
};
