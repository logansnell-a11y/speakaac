-- ────────────────────────────────────────────────────────────────────
-- Speak AAC — pending_upgrades table
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Why this exists: Stripe payment links let someone pay with any email.
-- If that email has no Speak account yet, the webhook used to log
-- "User not found — skipped" and return 200, so the money was taken and
-- the tier was never applied, silently and with no retry. The webhook
-- now parks the upgrade here, and claim-upgrade applies it the first
-- time that person signs in.
-- ────────────────────────────────────────────────────────────────────

create table if not exists pending_upgrades (
  id                bigint generated always as identity primary key,
  email             text not null,
  tier              text not null,
  stripe_session_id text,
  created_at        timestamptz default now(),
  claimed_at        timestamptz,
  claimed_by        uuid references auth.users(id) on delete set null
);

-- Stripe can retry a webhook, so the same session must not park twice.
create unique index if not exists pending_upgrades_session
  on pending_upgrades (stripe_session_id)
  where stripe_session_id is not null;

-- Claim lookups are always "unclaimed rows for this email".
create index if not exists pending_upgrades_unclaimed
  on pending_upgrades (lower(email))
  where claimed_at is null;

alter table pending_upgrades enable row level security;

-- No client-side policy on purpose. This table holds an email plus a paid
-- tier, which is exactly what a hostile client would want to forge. Only
-- the service role touches it, so leaving RLS on with zero policies means
-- the anon and authenticated keys can neither read nor write it.
