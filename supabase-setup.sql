-- Talent Radar: Database Setup
-- Paste this entire script into the Supabase SQL Editor and click "Run"

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create target_companies table
CREATE TABLE IF NOT EXISTS target_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')),
  heat_score INTEGER NOT NULL DEFAULT 0 CHECK (heat_score >= 0 AND heat_score <= 100),
  recruiting_window TEXT NOT NULL DEFAULT 'closed' CHECK (recruiting_window IN ('open', 'uncertain', 'closed')),
  radar_angle INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  search_modifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES target_companies(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('layoff', 'acquisition', 'leadership_change', 'funding_round', 'reorg', 'culture')),
  headline TEXT NOT NULL,
  source_url TEXT,
  why_it_matters TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('high', 'medium', 'low')),
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_config table (for storing last refresh time, etc.)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signals_company_id ON signals(company_id);
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_target_companies_heat_score ON target_companies(heat_score);

-- Disable RLS for simplicity (or configure policies as needed)
ALTER TABLE target_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create permissive policies so the API can read/write
CREATE POLICY "Allow all access to target_companies" ON target_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to signals" ON signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to app_config" ON app_config FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA: 10 Companies
-- ============================================

INSERT INTO target_companies (id, company_name, domain, tier, heat_score, recruiting_window, radar_angle, notes, search_modifier) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Google DeepMind', 'deepmind.com', 'tier_1', 87, 'open', 0, NULL, NULL),
  ('00000000-0000-0000-0000-000000000002', 'Anthropic', 'anthropic.com', 'tier_1', 45, 'uncertain', 36, NULL, NULL),
  ('00000000-0000-0000-0000-000000000003', 'OpenAI', 'openai.com', 'tier_1', 92, 'open', 72, NULL, NULL),
  ('00000000-0000-0000-0000-000000000004', 'Cursor', 'cursor.sh', 'tier_1', 30, 'closed', 108, NULL, 'AI'),
  ('00000000-0000-0000-0000-000000000005', 'Notion', 'notion.so', 'tier_2', 68, 'open', 144, NULL, 'app'),
  ('00000000-0000-0000-0000-000000000006', 'Linear', 'linear.app', 'tier_2', 22, 'closed', 180, NULL, 'app'),
  ('00000000-0000-0000-0000-000000000007', 'Stripe', 'stripe.com', 'tier_2', 55, 'uncertain', 216, NULL, NULL),
  ('00000000-0000-0000-0000-000000000008', 'Scale AI', 'scale.com', 'tier_2', 78, 'open', 252, NULL, NULL),
  ('00000000-0000-0000-0000-000000000009', 'Cohere', 'cohere.com', 'tier_3', 61, 'open', 288, NULL, NULL),
  ('00000000-0000-0000-0000-000000000010', 'Mistral', 'mistral.ai', 'tier_3', 40, 'uncertain', 324, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA: 20 Signals
-- ============================================

INSERT INTO signals (id, company_id, signal_type, headline, source_url, why_it_matters, urgency, detected_at) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000003', 'leadership_change', 'CTO Mira Murati departs OpenAI amid organizational restructuring', NULL, 'Senior leadership departures often trigger a wave of follow-on exits from loyal team members. Engineers who joined under Murati may now be reconsidering their positions.', 'high', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000003', 'reorg', 'OpenAI transitions from nonprofit to for-profit capped structure', NULL, 'Major structural changes create uncertainty. Engineers who joined for the mission-driven nonprofit ethos may feel misaligned with the new direction.', 'high', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000003', 'culture', 'Glassdoor reviews flag increasing burnout and 80-hour work weeks', NULL, 'Sustained burnout culture is a leading indicator of attrition. Engineers at breaking point are most receptive to outreach.', 'medium', NOW() - INTERVAL '12 days'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'layoff', 'Google announces 12,000 role reductions across Alphabet divisions', NULL, 'Even if DeepMind is partially shielded, layoff anxiety spreads. Top performers often leave preemptively rather than wait for the next round.', 'high', NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'reorg', 'DeepMind and Google Brain merger creates internal team redundancies', NULL, 'Merged teams mean duplicated roles and political jockeying. Engineers who lose scope or reporting lines become immediate targets for recruitment.', 'high', NOW() - INTERVAL '8 days'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 'funding_round', 'Alphabet shifts AI budget allocation, freezing some DeepMind research lines', NULL, 'Budget freezes signal deprioritization. Researchers whose projects lose funding are highly receptive to well-funded alternatives.', 'medium', NOW() - INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000008', 'layoff', 'Scale AI reduces workforce by 20% citing market conditions', NULL, 'Significant layoffs create survivor guilt and job insecurity. Remaining engineers often start passively looking within 30 days.', 'high', NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000008', 'leadership_change', 'VP of Engineering exits Scale AI for stealth startup', NULL, 'When engineering leaders leave, their direct reports lose their champion. This is the optimal window for targeted outreach to their former team.', 'high', NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000005', 'acquisition', 'Notion acquires Skiff, raising integration concerns among staff', NULL, 'Acquisitions create role uncertainty and cultural friction. Engineers from both sides may be looking for more stable environments.', 'medium', NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000005', 'culture', 'Notion engineers report frustration with slowing product velocity', NULL, 'Engineers who feel the product is stagnating become disengaged. They seek environments where they can ship faster and have more impact.', 'medium', NOW() - INTERVAL '20 days'),
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000007', 'layoff', 'Stripe cuts 14% of workforce in second round of layoffs', NULL, 'Repeated layoffs erode trust in leadership. Even top performers begin hedging their bets after multiple reduction events.', 'high', NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000007', 'funding_round', 'Stripe secondary sale values company at $50B, down from $95B peak', NULL, 'A declining valuation impacts equity compensation. Engineers whose options are underwater are significantly more open to new offers.', 'medium', NOW() - INTERVAL '14 days'),
  ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000002', 'funding_round', 'Anthropic closes $2B Series D led by Google', NULL, 'Fresh funding typically stabilizes a company, but mega-rounds can signal pressure to scale fast, which some engineers resist.', 'low', NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000002', 'culture', 'Reports of increasing pressure to ship Claude updates on aggressive timelines', NULL, 'Accelerated shipping pressure leads to technical debt and burnout. Engineers who value craft over speed may be open to calmer environments.', 'medium', NOW() - INTERVAL '18 days'),
  ('00000000-0000-0000-0000-000000000115', '00000000-0000-0000-0000-000000000009', 'reorg', 'Cohere restructures go-to-market team, pivoting from API to enterprise', NULL, 'Strategic pivots create uncertainty across the org. Engineers who joined for one vision may not align with the new enterprise focus.', 'medium', NOW() - INTERVAL '9 days'),
  ('00000000-0000-0000-0000-000000000116', '00000000-0000-0000-0000-000000000009', 'leadership_change', 'Cohere CTO steps back to advisory role', NULL, 'CTO transitions signal technical direction changes. Engineers closely aligned with the departing leader become recruitment targets.', 'medium', NOW() - INTERVAL '11 days'),
  ('00000000-0000-0000-0000-000000000117', '00000000-0000-0000-0000-000000000004', 'funding_round', 'Cursor raises $400M Series B at $2.5B valuation', NULL, 'High valuation with fresh funding makes Cursor engineers harder to recruit. Window is currently closed unless equity or mission differentiation is compelling.', 'low', NOW() - INTERVAL '25 days'),
  ('00000000-0000-0000-0000-000000000118', '00000000-0000-0000-0000-000000000006', 'culture', 'Linear maintains lean team philosophy, rejecting hypergrowth pressure', NULL, 'Stable culture and intentional growth make Linear engineers content. Low priority target unless individual circumstances change.', 'low', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000119', '00000000-0000-0000-0000-000000000010', 'funding_round', 'Mistral raises EUR600M but faces growing competition from US labs', NULL, 'Competitive pressure and geographic challenges may cause some engineers to consider US-based opportunities with larger compute budgets.', 'medium', NOW() - INTERVAL '13 days'),
  ('00000000-0000-0000-0000-000000000120', '00000000-0000-0000-0000-000000000010', 'reorg', 'Mistral reorganizes research teams after rapid hiring spree', NULL, 'Post-hiring-spree reorgs are normal growing pains. Monitor but low urgency unless key individuals signal dissatisfaction.', 'low', NOW() - INTERVAL '22 days')
ON CONFLICT (id) DO NOTHING;

-- Initialize app_config
INSERT INTO app_config (key, value) VALUES ('last_refresh', NULL)
ON CONFLICT (key) DO NOTHING;

-- Done! You should see "Success. No rows returned" or similar.
