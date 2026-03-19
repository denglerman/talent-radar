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
