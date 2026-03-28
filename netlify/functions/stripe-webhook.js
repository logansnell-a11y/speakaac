// Netlify Function: Stripe webhook handler
// ─────────────────────────────────────────────────────────────────────
// Listens for checkout.session.completed events from Stripe.
// Verifies the signature, maps the purchased price to a tier,
// and updates the user's tier in Supabase via the service role key.
// ─────────────────────────────────────────────────────────────────────

const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL           = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Map Stripe Price IDs → Speak tier
// Fill these in from Stripe Dashboard → Products → each price's ID
const PRICE_TO_TIER = {
  [process.env.STRIPE_PRICE_FAMILY]:      'family',
  [process.env.STRIPE_PRICE_CLINIC]:      'clinic',
  [process.env.STRIPE_PRICE_INSTITUTION]: 'institution',
  [process.env.STRIPE_PRICE_LIFETIME]:    'lifetime',
};

// ── Stripe signature verification (no stripe npm pkg needed) ─────────
const crypto = require('crypto');

function computeStripeSignature(payload, secret, timestamp) {
  const signed = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
}

function verifyStripeSignature(body, sigHeader, secret) {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  // Reject events older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  const expected = computeStripeSignature(body, secret, timestamp);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── Supabase helpers ──────────────────────────────────────────────────
async function getUserByEmail(email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey:        SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.users?.[0] || null;
}

async function setUserTier(userId, tier) {
  // Read current settings first so we don't overwrite other fields
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=settings`,
    {
      headers: {
        apikey:        SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  let currentSettings = {};
  if (getRes.ok) {
    const rows = await getRes.json();
    currentSettings = rows[0]?.settings || {};
  }

  const updatedSettings = { ...currentSettings, tier };

  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey:        SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:        'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      user_id:    userId,
      settings:   updatedSettings,
      updated_at: new Date().toISOString(),
    }),
  });

  return upsertRes.ok;
}

// ── Main handler ──────────────────────────────────────────────────────
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sigHeader = event.headers['stripe-signature'];
  if (!sigHeader || !STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 400, body: 'Missing signature' };
  }

  if (!verifyStripeSignature(event.body, sigHeader, STRIPE_WEBHOOK_SECRET)) {
    console.error('Stripe signature verification failed');
    return { statusCode: 400, body: 'Invalid signature' };
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Only handle completed checkouts
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const session = stripeEvent.data.object;
  const email   = session.customer_details?.email || session.customer_email;

  // Tier can come from metadata on the payment link or the session
  let tier = session.metadata?.tier || session.client_reference_id;

  // If no metadata tier, fall back to price ID mapping
  if (!tier || !['family', 'clinic', 'institution', 'lifetime'].includes(tier)) {
    const lineItemsRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      }
    );
    if (lineItemsRes.ok) {
      const lineItems = await lineItemsRes.json();
      const priceId   = lineItems.data?.[0]?.price?.id;
      tier            = PRICE_TO_TIER[priceId];
    }
  }

  if (!tier) {
    console.error('Could not determine tier for session:', session.id);
    return { statusCode: 200, body: 'Unknown tier — skipped' };
  }

  if (!email) {
    console.error('No email in session:', session.id);
    return { statusCode: 200, body: 'No email — skipped' };
  }

  // Find the Supabase user by email
  const user = await getUserByEmail(email);
  if (!user) {
    console.warn(`No Supabase user found for email: ${email}`);
    // Not an error — they may not have signed up yet; Stripe still succeeded
    return { statusCode: 200, body: 'User not found — skipped' };
  }

  const ok = await setUserTier(user.id, tier);
  if (!ok) {
    console.error(`Failed to set tier ${tier} for user ${user.id}`);
    return { statusCode: 500, body: 'Supabase update failed' };
  }

  console.log(`Set tier=${tier} for user=${user.id} (${email})`);
  return { statusCode: 200, body: 'OK' };
};
