# Speak — SMS Messaging Build Plan + Invention Log
**Author:** Logan James Snell · **Date:** July 4, 2026 · App: Speak AAC
**Doubles as a dated INVENTION-LOG entry for the non-provisional (due May 1, 2027).**

> ⚠️ SEQUENCING: This is a v2 subsystem. The current app (in-person AAC + email safety alerts) is already sellable TODAY. Do NOT let this build block selling. Build order: (A) sell the current app → (B) add SMS *alert* (small) → (C) this two-way bridge (flagship, days-to-weeks). Tease it to prospects before it's built.

---

## PHASE 1 (small) — SMS SAFETY ALERT (do first)
Extend `netlify/functions/send-safety-alert.js` to ALSO fire a Twilio SMS in parallel with the existing Resend email.
- Add `caregiver_phone` (E.164) to PIN-gated settings + Supabase.
- `Promise.allSettled([emailSend, smsSend])` so one failing doesn't block the other. (This = the patent's "multi-pathway alert architecture.")
- Env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- Message ≤160 chars: `SAFETY ALERT: {name} pressed {reason} at {time}. Check on them.`
- Consent checkbox: "I agree to receive safety-alert texts at this number."
- ⚠️ Start A2P 10DLC registration EARLY (days-to-weeks approval; it's the long pole, not the code).

---

## PHASE 2 (flagship) — TWO-WAY AAC ↔ SMS BRIDGE
Turns Speak from an in-person board into a REMOTE communication device. Nonverbal user composes via symbols → sends as normal SMS → contact replies as a normal text → reply appears on the tablet.
**Killer advantage: the contact needs NO app — they just text normally.**

### Data model (Supabase / Postgres)

```sql
-- People a user is allowed to text (caregiver-managed, PIN-gated)
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  phone        text not null,              -- E.164 e.g. +17855550123
  relationship text,                       -- "Mom", "Teacher"
  can_alert    boolean default true,       -- also usable for safety alerts
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- One dedicated Twilio number per user = clean inbound routing
create table twilio_numbers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  phone_number  text not null unique,      -- the user's texting identity, E.164
  active        boolean default true,
  provisioned_at timestamptz default now()
);

-- A thread between a user and one contact
create table conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  contact_id      uuid not null references contacts(id) on delete cascade,
  twilio_number   text not null,           -- the user's dedicated number
  last_message_at timestamptz default now(),
  created_at      timestamptz default now(),
  unique(user_id, contact_id)
);

-- Individual messages
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null,           -- denormalized for RLS
  direction       text not null check (direction in ('outbound','inbound')),
  body            text not null,
  twilio_sid      text,                    -- Twilio Message SID (tracking + dedup)
  status          text default 'queued',   -- queued|sent|delivered|failed|received
  created_at      timestamptz default now()
);
create index on messages (conversation_id, created_at);

-- RLS: user only sees their own rows (apply to all 4 tables)
alter table contacts       enable row level security;
alter table twilio_numbers enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
create policy own_rows on messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (repeat equivalent own-rows policy on the other 3 tables)

-- Enable Supabase Realtime on messages so the tablet gets inbound instantly
alter publication supabase_realtime add table messages;
```

**Inbound routing key:** dedicated number per user → on inbound, look up the user by `To` (their number), find/create conversation by `From` (contact's phone). This is why per-user numbers matter.

### Function 1 — `netlify/functions/sms-outbound.js` (tablet → phone)
```js
// Auth: require a valid Supabase session (verify JWT). Input: {contact_id, body}.
export async function handler(event) {
  const user = await requireAuthedUser(event);        // supabase JWT -> user_id
  const { contact_id, body } = JSON.parse(event.body);

  const contact = await supa.from('contacts').select('*')
    .eq('id', contact_id).eq('user_id', user.id).single();
  const num = await supa.from('twilio_numbers').select('phone_number')
    .eq('user_id', user.id).eq('active', true).single();

  // Send via Twilio REST (no SDK needed)
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    { method:'POST',
      headers:{ Authorization:'Basic '+btoa(`${sid}:${tok}`),
                'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: contact.phone, From: num.phone_number, Body: body }) });
  const tw = await res.json();

  const convo = await getOrCreateConversation(user.id, contact_id, num.phone_number);
  await supa.from('messages').insert({
    conversation_id: convo.id, user_id: user.id, direction:'outbound',
    body, twilio_sid: tw.sid, status: tw.status || 'sent' });
  await supa.from('conversations').update({ last_message_at:new Date() }).eq('id',convo.id);
  return { statusCode: 200, body: JSON.stringify({ ok:true, sid: tw.sid }) };
}
```

### Function 2 — `netlify/functions/sms-inbound.js` (phone → tablet; Twilio webhook)
```js
// Set this URL as the Twilio number's incoming-message webhook.
// Twilio POSTs form-encoded: From, To, Body, MessageSid.
export async function handler(event) {
  // 1) SECURITY: validate X-Twilio-Signature to prevent spoofing (Twilio validateRequest)
  if (!validateTwilioSignature(event, process.env.TWILIO_AUTH_TOKEN))
    return { statusCode: 403, body: 'bad signature' };

  const p = new URLSearchParams(event.body);
  const from = p.get('From'), to = p.get('To'), body = p.get('Body'), sid = p.get('MessageSid');

  const num = await supa.from('twilio_numbers').select('user_id')
    .eq('phone_number', to).single();                 // route by the user's number
  const contact = await supa.from('contacts').select('id')
    .eq('user_id', num.user_id).eq('phone', from).single();  // must be a known contact
  if (!contact) return twiml();                         // ignore texts from unknown numbers

  const convo = await getOrCreateConversation(num.user_id, contact.id, to);
  await supa.from('messages').insert({
    conversation_id: convo.id, user_id: num.user_id, direction:'inbound',
    body, twilio_sid: sid, status:'received' });
  await supa.from('conversations').update({ last_message_at:new Date() }).eq('id',convo.id);
  // Supabase Realtime auto-notifies the subscribed tablet. Ack Twilio:
  return twiml();  // return "<Response></Response>" with content-type text/xml
}
```

### Tablet (realtime + UI)
```js
// Subscribe: new inbound messages pop onto the chat instantly
supa.channel('msgs')
  .on('postgres_changes',
      { event:'INSERT', schema:'public', table:'messages',
        filter:`conversation_id=eq.${activeConvoId}` },
      ({ new: m }) => appendBubble(m))          // left=inbound, right=outbound
  .subscribe();
```
- **UI:** chat bubbles view; compose area = existing AAC grid + AI sentence builder + "Send"; contact picker to choose who to talk to.

### Setup checklist
- [ ] Twilio: provision a number per user (buy or auto-provision via API on signup); set each number's **incoming-message webhook** → `.../sms-inbound`.
- [ ] **A2P 10DLC registration** (start early).
- [ ] Netlify env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
- [ ] Supabase: run schema, RLS policies on all 4 tables, add `messages` to realtime publication.
- [ ] Validate `X-Twilio-Signature` on inbound (anti-spoof).

### Cost
Number ~$1–2/mo each · SMS ~$0.0079 each. Scales with users → naturally a **paid-tier feature.**

---

## PATENT — invention-log entry (this section IS the log)
**Dated July 4, 2026.** New matter beyond the provisional (which described SMS only as an *alert* channel):
- A **two-way communication bridge** translating AAC symbol/AI-composed messages into outbound SMS and routing inbound SMS replies back to the AAC device as a threaded conversation, using a per-user dedicated number for inbound routing, with realtime delivery to the device — enabling a nonverbal user to conduct remote back-and-forth conversations with a contact who uses only a standard phone (no app required).
- ACTION: include this in the **non-provisional (due May 1, 2027)** as an additional embodiment/claim. Keep this doc as the dated record.

---

## HIPAA / COMPLIANCE — checklist for WHEN you go clinical (NOT needed for consumer/family sales)
Consumer families ≠ HIPAA. Do the below only when landing a clinical/B2B (covered-entity) deal that involves PHI.
- **Infra:** move off Netlify (no BAA) + Supabase free (no BAA). Options: Supabase paid **HIPAA add-on** (likely faster since you're already on it) vs full AWS rebuild — price both then, don't assume AWS.
- **BAA chain (every subprocessor touching PHI):** hosting, DB, **Twilio (SMS)**, **Resend (email — verify they offer a BAA, or swap)**. Alert/message content ("{name} pressed hurt") = PHI in clinical context.
- **Policies:** privacy policy, security policy, breach-notification plan, access controls, audit logs, encryption at rest + in transit, risk assessment.
- **Get professional help:** healthcare-tech attorney / HIPAA consultant before going live clinical. SBIR / IMPACT Center can help fund + guide.
- Design tip: **minimize PHI stored** (first name + caregiver contact + usage; avoid diagnoses/medical records) to shrink compliance scope.
