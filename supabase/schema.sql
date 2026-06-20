-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- All tables are only ever accessed via the service_role key from server
-- code (lib/supabase.ts), so RLS is enabled with no policies: the anon/public
-- key cannot read or write any of them.

create table if not exists service_cache (
  cache_key text primary key,
  lat double precision not null,
  lng double precision not null,
  radius_km double precision not null,
  services jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists ai_tips (
  service_id bigint primary key,
  tip text not null,
  model text not null,
  generated_at timestamptz not null default now()
);

create table if not exists scheme_eligibility (
  slug text primary key,
  verdict text not null,
  model text not null,
  generated_at timestamptz not null default now()
);

-- AI-sourced phone is only ever non-null when confidence = 'high' (see
-- lib/facilityLookup.ts) — medium/low confidence is cached too, so we don't
-- re-query the same unknown place on every page load, but the app never
-- displays a phone number for those rows.
create table if not exists facility_lookup (
  service_id bigint primary key,
  phone text,
  confidence text not null,
  alt_name text,
  alt_phone text,
  model text not null,
  generated_at timestamptz not null default now()
);

-- Tracks total voice-assistant calls per UTC day, across ALL users — the
-- bottleneck here is Gemini's shared per-project daily quota, not any one
-- user's behavior, so this is a global counter, not a per-IP one (see
-- lib/voiceQuota.ts and lib/rateLimit.ts, which handles per-IP abuse
-- separately).
create table if not exists voice_usage (
  usage_date date primary key,
  count integer not null default 0
);

alter table service_cache enable row level security;
alter table ai_tips enable row level security;
alter table scheme_eligibility enable row level security;
alter table facility_lookup enable row level security;
alter table voice_usage enable row level security;
