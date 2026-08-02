-- ────────────────────────────────────────────────────────────────────
-- Speak AAC — safety_incidents LOCKDOWN migration
--
-- WHY: the original policy let the account holder read their own
-- incidents. In AAC the account holder is the caretaker. If the
-- caretaker is the abuser, the "private" channel showed them that the
-- user reported them, when, and who was contacted.
--
-- The channel is only private if the device account cannot read it.
-- Reads happen through the service role (Netlify functions) only.
--
-- Run in Supabase SQL Editor → New query.
-- ────────────────────────────────────────────────────────────────────

-- 1. Remove account-holder read access.
drop policy if exists "Users see own incidents" on safety_incidents;

-- No SELECT policy now exists. With RLS enabled that means: no client
-- using an anon/user JWT can read this table at all. The service role
-- key bypasses RLS and remains the only read path.
alter table safety_incidents enable row level security;
alter table safety_incidents force row level security;

-- 2. Belt and braces — revoke direct grants from the client-facing roles
--    so a future policy added by mistake still can't expose rows.
revoke all on safety_incidents from anon, authenticated;

-- 3. Insert stays server-side. The client should no longer write to this
--    table directly; send-safety-alert.js (service role) records it.
--    Nothing to grant here — service role bypasses RLS.

-- ────────────────────────────────────────────────────────────────────
-- Verify: run as an ordinary signed-in user. Both must return 0 rows.
--   select * from safety_incidents;
--   select count(*) from safety_incidents;
-- ────────────────────────────────────────────────────────────────────
