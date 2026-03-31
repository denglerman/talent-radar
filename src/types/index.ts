export type CompanyTier = 'tier_1' | 'tier_2' | 'tier_3';
export type SignalType = 'layoff' | 'acquisition' | 'leadership_change' | 'funding_round' | 'reorg' | 'culture';
export type UrgencyLevel = 'high' | 'medium' | 'low';
export type RecruitingWindow = 'open' | 'uncertain' | 'closed';

export interface Company {
  id: string;
  company_name: string;
  domain: string;
  tier: CompanyTier;
  heat_score: number;
  recruiting_window: RecruitingWindow;
  radar_angle: number;
  notes: string | null;
  search_modifier: string | null;
  created_at?: string;
}

export interface Signal {
  id: string;
  company_id: string;
  signal_type: SignalType;
  headline: string;
  source_url: string | null;
  why_it_matters: string | null;
  urgency: UrgencyLevel;
  detected_at: string;
}

export interface CompanyWithSignals extends Company {
  signals: Signal[];
}

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  layoff: 'Layoff',
  acquisition: 'Acquisition',
  leadership_change: 'Leadership',
  funding_round: 'Funding',
  reorg: 'Reorg',
  culture: 'Culture',
};

export const SIGNAL_TYPES: SignalType[] = ['layoff', 'acquisition', 'leadership_change', 'funding_round', 'reorg', 'culture'];

export const TIER_LABELS: Record<CompanyTier, string> = {
  tier_1: 'T1',
  tier_2: 'T2',
  tier_3: 'T3',
};

// ── Candidate types ──────────────────────────────────────────────────────────

export type CandidateSignalType = 'sentiment_shift' | 'topic_shift' | 'engagement_drop' | 'job_search_language' | 'github_activity' | 'github_quiet';
export type CandidateSignalSource = 'twitter' | 'github';
export type MobilityWindow = 'open' | 'uncertain' | 'closed';

export interface Candidate {
  id: string;
  name: string;
  current_company: string | null;
  current_role: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  github_username: string | null;
  tier: CompanyTier;
  mobility_score: number;
  mobility_window: MobilityWindow;
  last_scanned_at: string | null;
  created_at?: string;
  radar_angle: number;
}

export interface CandidateSignal {
  id: string;
  candidate_id: string;
  signal_type: CandidateSignalType;
  source: CandidateSignalSource;
  headline: string;
  detail: string | null;
  urgency: number;
  published_at: string | null;
  created_at: string;
}

export interface CandidateWithSignals extends Candidate {
  signals: CandidateSignal[];
}

export const CANDIDATE_SIGNAL_TYPE_LABELS: Record<CandidateSignalType, string> = {
  sentiment_shift: 'Sentiment',
  topic_shift: 'Topic Shift',
  engagement_drop: 'Engagement',
  job_search_language: 'Job Search',
  github_activity: 'GitHub Active',
  github_quiet: 'GitHub Quiet',
};

export const CANDIDATE_SIGNAL_TYPES: CandidateSignalType[] = [
  'sentiment_shift', 'topic_shift', 'engagement_drop', 'job_search_language', 'github_activity', 'github_quiet',
];
