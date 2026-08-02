// Netlify Function: Safety Alert Sender
// ─────────────────────────────────────────────────────────────────────
// Sends the private safety channel alert server-side via Resend.
// Keeps API credentials off the client, no rate-limit on free EmailJS tier.
// Falls back gracefully if RESEND_API_KEY is not yet configured.
// ─────────────────────────────────────────────────────────────────────

const RESEND_API_KEY       = process.env.RESEND_API_KEY;
const FROM_ADDRESS         = 'Speak Safety <safety@speakaac.org>';
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Record the incident server-side with the service role key.
// This is deliberately NOT done from the client: the device account belongs
// to the caretaker, and the caretaker must never be able to read this table.
async function recordIncident(row) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/safety_incidents`, {
      method: 'POST',
      headers: {
        apikey:         SUPABASE_SERVICE_KEY,
        Authorization:  `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (err) {
    console.error('Incident record error:', err);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // CORS — only speakaac.org may call this
  const origin = event.headers.origin || '';
  const allowed = ['https://speakaac.org', 'https://www.speakaac.org'];
  if (!allowed.includes(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const {
    to_email, to_name, user_name, reason, reason_key,
    last_message, timestamp, user_id,
  } = payload;

  if (!user_name) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  // Always log the incident — including when no trusted contact is configured,
  // which is itself a finding worth surfacing to the institution.
  await recordIncident({
    user_id:            user_id || null,
    user_name,
    reason:             reason_key || 'unknown',
    reason_label:       reason || '(not specified)',
    message_at_time:    last_message || null,
    alert_sent_to:      to_email || null,
    alert_sent_to_name: to_name  || null,
    no_contact:         !to_email,
    ts:                 new Date().toISOString(),
  });

  if (!to_email) {
    // Nothing to send, but the incident is on record.
    return { statusCode: 200, body: 'Recorded, no contact configured' };
  }

  if (!RESEND_API_KEY) {
    // Config not yet done — fall back to client-side EmailJS
    return { statusCode: 503, body: 'Resend not configured' };
  }

  const subject = `Urgent — ${user_name} used the private help channel`;

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#1a1a1e;border-radius:12px;padding:24px;border:1px solid #e05555;">
        <h2 style="color:#e05555;margin:0 0 16px;">Private Safety Alert</h2>
        <p style="color:#f0f0f2;margin:0 0 12px;">
          <strong style="color:#fff;">${user_name}</strong> used the private safety channel in Speak AAC.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="color:#9999aa;padding:6px 0;width:140px;">Reason selected</td>
            <td style="color:#f0f0f2;font-weight:600;">${reason || '(not specified)'}</td>
          </tr>
          <tr>
            <td style="color:#9999aa;padding:6px 0;">Last message</td>
            <td style="color:#f0f0f2;">${last_message || '(none)'}</td>
          </tr>
          <tr>
            <td style="color:#9999aa;padding:6px 0;">Time</td>
            <td style="color:#f0f0f2;">${timestamp}</td>
          </tr>
        </table>
        <div style="background:#2a1010;border:1px solid #e05555;border-radius:8px;padding:14px;margin-top:16px;">
          <p style="color:#e05555;margin:0;font-size:14px;">
            This alert was sent <strong>privately</strong> — it is not visible on the user's device
            and the caretaker in the room was not shown it.
            Please check on ${user_name} immediately and discreetly.
            If you believe they are in danger, contact authorities.
          </p>
        </div>
        <p style="color:#666672;font-size:12px;margin-top:20px;margin-bottom:0;">
          — Speak AAC Private Safety Channel · speakaac.org
        </p>
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      [to_email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', res.status, err);
      return { statusCode: 502, body: 'Send failed' };
    }

    const data = await res.json();
    console.log(`Safety alert sent → ${to_email} (id: ${data.id})`);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('Safety alert send error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
