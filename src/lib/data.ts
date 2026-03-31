import { supabase } from './supabase';
import { Company, Signal, CompanyWithSignals, Candidate, CandidateSignal, CandidateWithSignals } from '@/types';
import { SEED_COMPANIES, SEED_SIGNALS, SEED_CANDIDATES, SEED_CANDIDATE_SIGNALS } from './seed-data';

export async function getCompanies(): Promise<Company[]> {
  if (!supabase) return [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);
  try {
    const { data, error } = await supabase
      .from('target_companies')
      .select('*')
      .order('heat_score', { ascending: false });

    if (error || !data || data.length === 0) {
      return [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);
    }
    return data;
  } catch {
    return [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);
  }
}

export async function getSignals(): Promise<Signal[]> {
  if (!supabase) return [...SEED_SIGNALS].sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  try {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .order('detected_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [...SEED_SIGNALS].sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
    }
    return data;
  } catch {
    return [...SEED_SIGNALS].sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  }
}

export async function getCompaniesWithSignals(): Promise<CompanyWithSignals[]> {
  const [companies, signals] = await Promise.all([getCompanies(), getSignals()]);

  return companies.map((company) => ({
    ...company,
    signals: signals.filter((s) => s.company_id === company.id),
  }));
}

// ── Candidate data fetchers ──────────────────────────────────────────────────

export async function getCandidates(): Promise<Candidate[]> {
  if (!supabase) return [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('mobility_score', { ascending: false });

    if (error || !data || data.length === 0) {
      return [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);
    }
    return data;
  } catch {
    return [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);
  }
}

export async function getCandidateSignals(): Promise<CandidateSignal[]> {
  if (!supabase) return [...SEED_CANDIDATE_SIGNALS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  try {
    const { data, error } = await supabase
      .from('candidate_signals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [...SEED_CANDIDATE_SIGNALS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return data;
  } catch {
    return [...SEED_CANDIDATE_SIGNALS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export async function getCandidatesWithSignals(): Promise<CandidateWithSignals[]> {
  const [candidates, signals] = await Promise.all([getCandidates(), getCandidateSignals()]);

  return candidates.map((candidate) => ({
    ...candidate,
    signals: signals.filter((s) => s.candidate_id === candidate.id),
  }));
}

export async function addCompany(name: string, tier: Company['tier']): Promise<Company | null> {
  if (!supabase) return null;
  const domain = name.toLowerCase().replace(/\s+/g, '') + '.com';
  const angle = Math.floor(Math.random() * 360);

  try {
    const { data, error } = await supabase
      .from('target_companies')
      .insert({
        company_name: name,
        domain,
        tier,
        heat_score: 0,
        recruiting_window: 'uncertain',
        radar_angle: angle,
      })
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
