const crypto = require('crypto');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PRICE_TO_TIER = {
  [process.env.STRIPE_PRICE_FAMILY]:      'family',
  [process.env.STRIPE_PRICE_CLINIC]:      'clinic',
  [process.env.STRIPE_PRICE_INSTITUTION]: 'institution',
  [process.env.STRIPE_PRICE_LIFETIME]:    'lifetime',
};

function verifyStripeSignature(body, sigHeader, secret) {
  const parts     = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;
  if (Math.floor(Date.now() / 1000) - parseInt(timestamp, 10) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function getUserByEmail(email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!res.ok) return null;
  return (await res.json())?.users?.[0] || null;
}

async function setUserTier(userId, tier) {
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=settings`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  let currentSettings = {};
  if (getRes.ok) {
    const rows = await getRes.json();
    currentSettings = rows[0]?.settings || {};
  }

  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: userId, settings: { ...currentSettings, tier }, updated_at: new Date().toISOString() }),
  });
  return upsertRes.ok;
}

exports.handler = async function (event) {
  const method    = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const sigHeader = event.headers?.['stripe-signature'];

  if (method !== 'POST')                    return { statusCode: 405, body: 'Method not allowed' };
  if (!sigHeader || !STRIPE_WEBHOOK_SECRET) return { statusCode: 400, body: 'Missing signature' };
  if (!verifyStripeSignature(event.body, sigHeader, STRIPE_WEBHOOK_SECRET)) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  let stripeEvent;
  try { stripeEvent = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  if (stripeEvent.type !== 'checkout.session.completed') return { statusCode: 200, body: 'Ignored' };

  const session = stripeEvent.data.object;
  const email   = session.customer_details?.email || session.customer_email;
  let tier      = session.metadata?.tier || session.client_reference_id;

  if (!tier || !['family', 'clinic', 'institution', 'lifetime'].includes(tier)) {
    const liRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items`,
      { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    if (liRes.ok) {
      const li = await liRes.json();
      tier = PRICE_TO_TIER[li.data?.[0]?.price?.id];
    }
  }

  if (!tier)  { console.error('Unknown tier for session:', session.id); return { statusCode: 200, body: 'Unknown tier' }; }
  if (!email) { console.error('No email in session:', session.id);      return { statusCode: 200, body: 'No email' }; }

  const user = await getUserByEmail(email);
  if (!user) return { statusCode: 200, body: 'User not found' };

  const ok = await setUserTier(user.id, tier);
  if (!ok) return { statusCode: 500, body: 'Supabase update failed' };

  console.log(`Set tier=${tier} for user=${user.id} (${email})`);
  return { statusCode: 200, body: 'OK' };
};
