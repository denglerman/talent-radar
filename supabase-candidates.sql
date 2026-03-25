-- Candidate tracking tables for Cognition Talent Radar
-- Run this in the Supabase SQL Editor

create table candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  current_company text,
  current_role text,
  linkedin_url text,
  twitter_handle text,
  github_username text,
  tier text check (tier in ('tier_1', 'tier_2', 'tier_3')) default 'tier_2',
  mobility_score integer default 0,
  mobility_window text check (mobility_window in ('open', 'uncertain', 'closed')) default 'uncertain',
  last_scanned_at timestamp,
  created_at timestamp default now()
);

create table candidate_signals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  signal_type text check (signal_type in ('sentiment_shift', 'topic_shift', 'engagement_drop', 'job_search_language', 'github_activity', 'github_quiet')),
  source text check (source in ('twitter', 'github')),
  headline text not null,
  detail text,
  urgency integer check (urgency between 1 and 10),
  published_at timestamp,
  created_at timestamp default now()
);

-- Seed 6 placeholder candidates
insert into candidates (name, current_company, current_role, linkedin_url, twitter_handle, github_username, tier, mobility_score, mobility_window) values
  ('Sarah Chen', 'Google DeepMind', 'Staff Research Engineer', 'https://linkedin.com/in/sarachen', 'sarachen_ml', 'sarachen-dev', 'tier_1', 82, 'open'),
  ('Marcus Rivera', 'OpenAI', 'Senior Software Engineer', 'https://linkedin.com/in/marcusrivera', 'mrivera_eng', 'mrivera42', 'tier_1', 65, 'uncertain'),
  ('Priya Sharma', 'Anthropic', 'ML Platform Lead', 'https://linkedin.com/in/priyasharma', 'priya_builds', 'priyasharma-ml', 'tier_1', 35, 'closed'),
  ('James Park', 'Stripe', 'Engineering Manager', 'https://linkedin.com/in/jamespark', 'jpark_tech', 'jparkdev', 'tier_2', 74, 'open'),
  ('Elena Volkov', 'Scale AI', 'Principal Engineer', 'https://linkedin.com/in/elenavolkov', 'evolkov_ai', 'evolkov', 'tier_2', 48, 'uncertain'),
  ('David Kim', 'Notion', 'Senior Frontend Engineer', 'https://linkedin.com/in/davidkim', 'dkim_dev', 'dkimdev', 'tier_3', 25, 'closed');
