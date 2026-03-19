import { supabase } from './supabase';
import { Company, Signal, CompanyWithSignals } from '@/types';
import { SEED_COMPANIES, SEED_SIGNALS } from './seed-data';

export async function getCompanies(): Promise<Company[]> {
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

export async function addCompany(name: string, tier: Company['tier']): Promise<Company | null> {
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
