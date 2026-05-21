// Netlify Function: Self-serve account deletion
// ─────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/delete-account
// Authorization: Bearer <supabase JWT>
//
// Deletes all user data in order, then cancels any active Stripe
// subscription. Atomic in spirit — returns 500 on any failure so
// the client can retry before partial state exists.
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY   = process.env.STRIPE_SECRET_KEY;

// ── JWT verification (same pattern as ai-sentence.js) ────────────────
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

// ── Supabase row deletion ─────────────────────────────────────────────
async function deleteRows(table, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey:        SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer:        'return=minimal',
      },
    }
  );
  return res.ok;
}

async function deleteAuthUser(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey:        SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  return res.ok;
}

// ── Stripe cleanup ────────────────────────────────────────────────────
async function cancelStripeSubscriptions(email) {
  if (!STRIPE_SECRET_KEY) return; // Stripe not configured — skip

  // Find customer by email
  const custRes = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
  );
  if (!custRes.ok) return;
  const custData = await custRes.json();
  const customer = custData.data?.[0];
  if (!customer) return;

  // List active subscriptions
  const subRes = await fetch(
    `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=10`,
    { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
  );
  if (!subRes.ok) return;
  const subData = await subRes.json();

  // Cancel each one immediately
  for (const sub of subData.data || []) {
    await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
  }
}

// ── Main handler ──────────────────────────────────────────────────────
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) {
    return { statusCode: 401, body: 'Missing auth token' };
  }

  const user = await verifySupabaseJWT(jwt);
  if (!user?.id) {
    return { statusCode: 401, body: 'Invalid or expired token' };
  }

  const { id: userId, email } = user;

  // Delete data in dependency order (ai_usage and events first,
  // then profiles, then the auth record itself)
  const aiOk      = await deleteRows('ai_usage', userId);
  const eventsOk  = await deleteRows('events', userId);
  const profileOk = await deleteRows('profiles', userId);

  if (!aiOk || !eventsOk || !profileOk) {
    console.error(`Row deletion failed for user ${userId} — ai:${aiOk} events:${eventsOk} profile:${profileOk}`);
    return { statusCode: 500, body: 'Failed to delete user data' };
  }

  const authOk = await deleteAuthUser(userId);
  if (!authOk) {
    console.error(`Auth user deletion failed for ${userId}`);
    return { statusCode: 500, body: 'Failed to delete auth record' };
  }

  // Stripe cancellation is best-effort — don't fail the response if it errors,
  // since the auth record is already gone and a subscription.deleted webhook
  // would have nothing to revert anyway.
  try {
    await cancelStripeSubscriptions(email);
  } catch (err) {
    console.warn('Stripe cancellation error (non-fatal):', err.message);
  }

  console.log(`Account deleted: user=${userId} email=${email}`);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};
