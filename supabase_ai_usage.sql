-- ────────────────────────────────────────────────────────────────────
-- Speak AAC — ai_usage table
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New query)
-- ────────────────────────────────────────────────────────────────────

-- 1. Create the table
create table if not exists ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,  -- null for anon
  ip          text,           -- only stored for unauthenticated requests
  words_count integer,        -- how many words were in the request
  tier        text,           -- 'anon', 'free', 'family', 'clinic', 'institution'
  created_at  timestamptz default now()
);

-- 2. Index for fast per-user daily count queries
create index if not exists ai_usage_user_date
  on ai_usage (user_id, created_at desc)
  where user_id is not null;

-- 3. Enable Row Level Security
alter table ai_usage enable row level security;

-- 4. Users can read their own rows (for future "usage" display in the app)
create policy "Users see own usage"
  on ai_usage for select
  using (auth.uid() = user_id);

-- The Netlify function uses the service role key and bypasses RLS for inserts.
-- No user-facing insert policy is needed.

-- ────────────────────────────────────────────────────────────────────
-- OPTIONAL: View for Logan to monitor usage and cost
-- Each Claude Haiku request ≈ $0.00015–$0.00025
-- ────────────────────────────────────────────────────────────────────

create or replace view ai_usage_summary as
select
  date_trunc('day', created_at) as day,
  tier,
  count(*)                      as requests,
  sum(words_count)              as total_words,
  round(count(*) * 0.0002, 4)  as est_cost_usd   -- rough upper estimate
from ai_usage
group by 1, 2
order by 1 desc, 2;

-- To check usage: SELECT * FROM ai_usage_summary;
-- To see today's totals: SELECT * FROM ai_usage_summary WHERE day = current_date;
