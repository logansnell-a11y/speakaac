-- ────────────────────────────────────────────────────────────────────
-- Speak AAC — safety_incidents MIGRATION v2  (Sept 3 2026)
--
-- Supersedes supabase_safety_incidents_lockdown.sql. Run THIS ONE.
-- It does the lockdown that was never run, plus adds the incident_id
-- column the two-tier alert flow needs.
--
-- Supabase → SQL Editor → New query → paste → Run. Takes ~2 seconds.
-- ────────────────────────────────────────────────────────────────────

-- ── 1. LOCKDOWN ─────────────────────────────────────────────────────
-- The original policy let the account holder read their own incidents.
-- In AAC the account holder is the CARETAKER. If the caretaker is the
-- abuser, the "private" channel showed them that they had been reported,
-- when, and who was contacted. The channel is only private if the device
-- account cannot read this table at all.
drop policy if exists "Users see own incidents" on safety_incidents;

alter table safety_incidents enable row level security;
alter table safety_incidents force  row level security;

-- Belt and braces: even a policy added by mistake later cannot expose rows.
revoke all on safety_incidents from anon, authenticated;

-- ── 2. incident_id, for the two-tier alert ──────────────────────────
-- The alert email carries only this reference plus a signed link. The
-- content stays here. Nothing identifying reaches the email vendor.
alter table safety_incidents
  add column if not exists incident_id text;

create unique index if not exists safety_incidents_incident_id
  on safety_incidents (incident_id);

-- ── 3. VERIFY ───────────────────────────────────────────────────────
-- Run these as an ordinary signed-in user (NOT the SQL editor, which uses
-- the service role). Both must return zero rows or an error:
--   select * from safety_incidents;
--   select count(*) from safety_incidents;
--
-- Then confirm the column exists:
--   select column_name from information_schema.columns
--    where table_name = 'safety_incidents' and column_name = 'incident_id';
