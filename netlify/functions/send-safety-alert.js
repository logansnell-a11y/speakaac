// Netlify Function: Safety Alert Sender
// ─────────────────────────────────────────────────────────────────────
// Sends the private safety channel alert server-side via Resend.
// Keeps API credentials off the client, no rate-limit on free EmailJS tier.
// Falls back gracefully if RESEND_API_KEY is not yet configured.
// ─────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

const RESEND_API_KEY       = process.env.RESEND_API_KEY;
const LINK_SECRET          = process.env.INCIDENT_LINK_SECRET;
const SITE_ORIGIN          = 'https://speakaac.org';
const LINK_TTL_DAYS        = 7;
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

// ── Signed one-time-ish link ────────────────────────────────────────
// HMAC over "<incidentId>.<expiry>". Unforgeable without INCIDENT_LINK_SECRET
// and it names exactly one incident.
//
// TTL is 7 days, not 24 hours, on purpose. A trusted contact who does not
// check email for two days must still be able to open a distress report.
// A dead link on a real safety alert is a worse failure than a slightly
// longer valid window, and the link is only ever as exposed as the inbox it
// was sent to — which in the old design received the full content anyway.
const b64u = buf => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function mintLink(incidentId) {
  const exp = Math.floor(Date.now() / 1000) + LINK_TTL_DAYS * 86400;
  const payload = `${incidentId}.${exp}`;
  const sig = b64u(crypto.createHmac('sha256', LINK_SECRET).update(payload).digest());
  return `${SITE_ORIGIN}/incident.html?t=${b64u(payload)}.${sig}`;
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

  // ── Incident reference ──────────────────────────────────────────────
  // Short, unguessable enough to sit in a subject line, and meaningless to
  // anyone who is not the trusted contact.
  const incidentId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6))
    .toUpperCase().slice(-6);


  // ────────────────────────────────────────────────────────────────────
  // TEMPORARY — REVERT WHEN supabase_safety_incidents_lockdown.sql HAS RUN
  //
  // The old RLS policy (auth.uid() = user_id) is still live on
  // safety_incidents, so the device account can still read the table
  // directly through PostgREST with the public anon key. Redacting fields
  // does not fix that: the existence and timestamp of a row is itself the
  // disclosure — it tells the caretaker that a report was filed and when.
  //
  // So until the lockdown runs, do not write a row at all. The alert email
  // to the trusted contact is unaffected and remains the primary safety
  // path. The incident is written to the function log instead, which only
  // the site owner can read and the caretaker cannot query.
  //
  // To revert: delete this block and the early return below.
  // ────────────────────────────────────────────────────────────────────
  const LOCKDOWN_APPLIED = false;

  if (!LOCKDOWN_APPLIED) {
    console.warn('[SAFETY INCIDENT — not persisted, awaiting RLS lockdown]', JSON.stringify({
      user_id: user_id || null,
      user_name,
      reason: reason_key || 'unknown',
      reason_label: reason || '(not specified)',
      message_at_time: last_message || null,
      alert_sent_to: to_email || null,
      alert_sent_to_name: to_name || null,
      no_contact: !to_email,
      incident_id: incidentId,
      ts: new Date().toISOString(),
    }));
  }

  // Always log the incident — including when no trusted contact is configured,
  // which is itself a finding worth surfacing to the institution.
  if (LOCKDOWN_APPLIED) await recordIncident({
    incident_id:        incidentId,
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

  // ── THE SUBJECT LINE IS A DISCLOSURE SURFACE ────────────────────────
  // A subject renders on lock screens, in notification banners, and in inbox
  // list views — without the phone ever being unlocked. The original subject
  // named the user and stated they had used the "private help channel". Anyone
  // glancing at the contact's phone read a full disclosure, in exactly the
  // situation this channel exists for.
  //
  // Same reasoning that removed the mailto: fallback in app.js, applied to the
  // RECEIVING device instead of the sending one.
  const subject = `Speak · incident ${incidentId}`;

  // ── TWO-TIER ALERTING ───────────────────────────────────────────────
  // Tier 1 (this email — leaves our control): a reference and a signed link.
  // Tier 2 (view-incident.js — behind an HMAC token): the actual content.
  //
  // Resend, EmailJS, and any future SMS carrier see a reference and a token.
  // They never see who, why, or what was said. That is what keeps identifying
  // information out of a vendor's hands without a BAA.
  //
  // FAIL-SAFE, DELIBERATELY: if the incident was not persisted (the v2
  // migration has not run) or INCIDENT_LINK_SECRET is unset, we send the full
  // content rather than a link that would 404. A missed distress report is a
  // worse failure than a disclosure, and this is a config error you fix in
  // minutes — so it warns loudly instead of failing quietly.
  const twoTier = LOCKDOWN_APPLIED && !!LINK_SECRET;
  if (!twoTier) {
    console.warn('[SAFETY] two-tier DISABLED, sending full-content email.',
      { lockdown_applied: LOCKDOWN_APPLIED, link_secret_set: !!LINK_SECRET });
  }

  const preheader = `
    <!-- Overrides the client's preview snippet, so nothing below surfaces in a
         notification banner. Hidden in the rendered email. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      Open to view this alert.
    </div>`;

  const shell = inner => `${preheader}
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#1a1a1e;border-radius:12px;padding:24px;border:1px solid #e05555;">
        ${inner}
        <p style="color:#666672;font-size:12px;margin-top:20px;margin-bottom:0;">
          — Speak AAC Private Safety Channel · speakaac.org<br>
          Incident ${incidentId}
        </p>
      </div>
    </div>`;

  const html = twoTier
    ? shell(`
        <h2 style="color:#e05555;margin:0 0 16px;">Safety alert</h2>
        <p style="color:#f0f0f2;margin:0 0 20px;">
          Someone you are listed as the trusted contact for raised a safety alert
          in Speak. The details are not included in this email on purpose.
        </p>
        <a href="${mintLink(incidentId)}"
           style="display:inline-block;background:#e05555;color:#fff;text-decoration:none;
                  padding:13px 26px;border-radius:8px;font-weight:600;">
          Open the alert
        </a>
        <p style="color:#9999aa;font-size:13px;margin:20px 0 0;">
          This link works for ${LINK_TTL_DAYS} days and opens this one alert.
          If you believe someone is in danger, contact authorities.
        </p>`)
    : shell(`
        <h2 style="color:#e05555;margin:0 0 16px;">Private Safety Alert</h2>
        <p style="color:#f0f0f2;margin:0 0 12px;">
          <strong style="color:#fff;">${user_name}</strong> used the private safety channel in Speak AAC.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="color:#9999aa;padding:6px 0;width:140px;">Reason selected</td>
              <td style="color:#f0f0f2;font-weight:600;">${reason || '(not specified)'}</td></tr>
          <tr><td style="color:#9999aa;padding:6px 0;">Last message</td>
              <td style="color:#f0f0f2;">${last_message || '(none)'}</td></tr>
          <tr><td style="color:#9999aa;padding:6px 0;">Time</td>
              <td style="color:#f0f0f2;">${timestamp}</td></tr>
        </table>
        <div style="background:#2a1010;border:1px solid #e05555;border-radius:8px;padding:14px;margin-top:16px;">
          <p style="color:#e05555;margin:0;font-size:14px;">
            This alert was sent <strong>privately</strong> — it is not visible on the
            user's device and the caretaker in the room was not shown it.
            Please check on ${user_name} immediately and discreetly.
            If you believe they are in danger, contact authorities.
          </p>
        </div>`);

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
