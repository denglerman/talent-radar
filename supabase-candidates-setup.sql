-- Talent Radar: Candidate Tracking Database Setup
-- Paste this entire script into the Supabase SQL Editor and click "Run"

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  current_company TEXT,
  current_role TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  github_username TEXT,
  tier TEXT CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')) DEFAULT 'tier_2',
  mobility_score INTEGER DEFAULT 0,
  mobility_window TEXT CHECK (mobility_window IN ('open', 'uncertain', 'closed')) DEFAULT 'uncertain',
  radar_angle INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create candidate_signals table
CREATE TABLE IF NOT EXISTS candidate_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  signal_type TEXT CHECK (signal_type IN ('sentiment_shift', 'topic_shift', 'engagement_drop', 'job_search_language', 'github_activity', 'github_quiet')),
  source TEXT CHECK (source IN ('twitter', 'github')),
  headline TEXT NOT NULL,
  detail TEXT,
  urgency INTEGER CHECK (urgency BETWEEN 1 AND 10),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_candidate_signals_candidate_id ON candidate_signals(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_signals_created_at ON candidate_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_candidates_mobility_score ON candidates(mobility_score);

-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_signals ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all access to candidates" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to candidate_signals" ON candidate_signals FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA: 6 Candidates
-- ============================================

INSERT INTO candidates (id, name, current_company, current_role, linkedin_url, twitter_handle, github_username, tier, mobility_score, mobility_window, radar_angle, last_scanned_at) VALUES
  ('00000000-0000-0000-0000-000000000201', 'Sarah Chen', 'Google DeepMind', 'Senior Research Scientist', 'https://linkedin.com/in/sarachen', 'sarachen_ml', 'sarahchen', 'tier_1', 78, 'open', 30, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000202', 'Marcus Rivera', 'OpenAI', 'Staff Software Engineer', 'https://linkedin.com/in/marcusrivera', 'mrivera_dev', 'marcusrivera', 'tier_1', 85, 'open', 90, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000203', 'Priya Patel', 'Anthropic', 'ML Infrastructure Lead', 'https://linkedin.com/in/priyapatel', 'priya_infra', 'priyapatel', 'tier_1', 42, 'uncertain', 150, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000204', 'James Wright', 'Scale AI', 'Engineering Manager', 'https://linkedin.com/in/jameswright', 'jwrighteng', 'jameswright', 'tier_2', 65, 'uncertain', 210, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000205', 'Elena Kowalski', 'Stripe', 'Principal Engineer', 'https://linkedin.com/in/elenakowalski', 'elena_kow', 'elenakowalski', 'tier_2', 55, 'uncertain', 270, NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000206', 'David Kim', 'Cohere', 'Research Engineer', 'https://linkedin.com/in/davidkim', 'dkim_ai', 'davidkim', 'tier_3', 25, 'closed', 330, NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA: 10 Candidate Signals
-- ============================================

INSERT INTO candidate_signals (id, candidate_id, signal_type, source, headline, detail, urgency, published_at) VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000202', 'sentiment_shift', 'twitter', 'Expressing frustration with organizational changes', 'Recent tweets suggest growing dissatisfaction with internal restructuring at OpenAI.', 8, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'job_search_language', 'twitter', 'Retweeted multiple "we''re hiring" posts from competitors', 'Engaged with job postings from three different AI startups in the past week.', 9, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000201', 'github_activity', 'github', 'Spike in personal project commits', 'Pushed 47 commits to a personal ML framework in 2 weeks — possible side project ramping up.', 6, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000201', 'topic_shift', 'twitter', 'Shifted focus from research papers to startup culture topics', 'Recent tweets pivot from deep learning papers to threads about founding teams and equity.', 7, NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000203', 'engagement_drop', 'twitter', 'Decreased social media activity', 'Twitter engagement dropped 60% over the past month compared to previous average.', 4, NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000204', 'sentiment_shift', 'twitter', 'Public comments about layoff survivor guilt', 'Tweeted about the emotional toll of watching colleagues get laid off.', 7, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000204', 'github_quiet', 'github', 'No public GitHub activity in 45 days', 'Previously active open-source contributor has gone silent — possible disengagement.', 5, NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000205', 'topic_shift', 'twitter', 'Discussing distributed systems roles at smaller companies', 'Multiple tweets about the appeal of early-stage infra work vs. big company politics.', 6, NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000205', 'github_activity', 'github', 'Forked and starred multiple AI framework repos', 'Exploring AI/ML infrastructure projects outside of current Stripe payments focus.', 5, NOW() - INTERVAL '8 days'),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000206', 'github_activity', 'github', 'Consistent open-source contributions', 'Steady commit history to Cohere-related repos — appears engaged with current work.', 2, NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Done!
