-- ────────────────────────────────────────────────────────────────────
-- Speak AAC — safety_incidents table
-- Evidence-grade incident log for the private safety channel.
-- Run once in Supabase SQL Editor → New query.
-- ────────────────────────────────────────────────────────────────────

create table if not exists safety_incidents (
  id                 bigint generated always as identity primary key,
  user_id            uuid references auth.users(id) on delete cascade,
  user_name          text     not null,
  reason             text     not null,  -- key: 'hurting', 'scared', etc.
  reason_label       text     not null,  -- human-readable label shown to caretaker
  message_at_time    text,               -- what the user had typed at time of alert
  alert_sent_to      text,               -- trusted contact email (null if not configured)
  alert_sent_to_name text,               -- trusted contact display name
  no_contact         boolean  default false,  -- true if alert fired but no email configured
  ts                 timestamptz not null,    -- ISO timestamp of the incident
  created_at         timestamptz default now()
);

-- Fast per-user chronological query
create index if not exists safety_incidents_user_ts
  on safety_incidents (user_id, ts desc);

-- Row-level security
alter table safety_incidents enable row level security;

-- Users (and family members on the same account) can read their own incidents
create policy "Users see own incidents"
  on safety_incidents for select
  using (auth.uid() = user_id);

-- The Netlify functions use the service role key and bypass RLS for inserts.
-- No user-facing insert policy is needed.


-- ────────────────────────────────────────────────────────────────────
-- Useful queries for clinical reporting and SBIR outcomes data:
-- ────────────────────────────────────────────────────────────────────

-- All incidents for a specific user (replace UUID):
-- SELECT * FROM safety_incidents WHERE user_id = '<uuid>' ORDER BY ts DESC;

-- Summary stats across all users (service role only):
-- SELECT
--   date_trunc('month', ts) AS month,
--   count(*) AS total_incidents,
--   count(*) FILTER (WHERE no_contact = false) AS alerts_sent,
--   count(*) FILTER (WHERE reason = 'hurting') AS hurting_reports,
--   count(*) FILTER (WHERE reason = 'hidden_trigger') AS hidden_trigger_activations
-- FROM safety_incidents
-- GROUP BY 1 ORDER BY 1 DESC;

-- For SBIR Phase I outcomes report:
-- SELECT
--   user_id,
--   count(*) AS incident_count,
--   min(ts) AS first_incident,
--   max(ts) AS last_incident
-- FROM safety_incidents
-- GROUP BY user_id;
