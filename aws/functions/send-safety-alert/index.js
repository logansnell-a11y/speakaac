const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = 'Speak Safety <safety@speakaac.org>';
const ALLOWED        = ['https://speakaac.org', 'https://www.speakaac.org'];

exports.handler = async function (event) {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const origin = event.headers?.['origin'] || event.headers?.['Origin'] || '';

  if (!ALLOWED.includes(origin)) return { statusCode: 403, body: 'Forbidden' };
  if (method !== 'POST')         return { statusCode: 405, body: 'Method not allowed' };

  if (!RESEND_API_KEY) return { statusCode: 503, body: 'Resend not configured' };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { to_email, user_name, reason, last_message, timestamp } = payload;
  if (!to_email || !user_name) return { statusCode: 400, body: 'Missing required fields' };

  const subject = `🔴 Safety Alert — ${user_name} used the private help channel`;

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#1a1a1e;border-radius:12px;padding:24px;border:1px solid #e05555;">
        <h2 style="color:#e05555;margin:0 0 16px;">⚠️ Private Safety Alert</h2>
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
            ⚠️ This alert was sent <strong>privately</strong> — the caretaker in the room did not see this.
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
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to_email], subject, html }),
    });

    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return { statusCode: 502, body: 'Send failed' };
    }

    const data = await res.json();
    console.log(`Safety alert sent → ${to_email} (id: ${data.id})`);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('Safety alert error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
