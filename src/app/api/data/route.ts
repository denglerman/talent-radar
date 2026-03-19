import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_COMPANIES, SEED_SIGNALS } from '@/lib/seed-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    // Return seed data
    const companies = [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);
    const signals = [...SEED_SIGNALS].sort(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
    const companiesWithSignals = companies.map((company) => ({
      ...company,
      signals: signals.filter((s) => s.company_id === company.id),
    }));
    return NextResponse.json({ companiesWithSignals, lastRefresh: null });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const [companiesRes, signalsRes, configRes] = await Promise.all([
      supabase.from('target_companies').select('*').order('heat_score', { ascending: false }),
      supabase.from('signals').select('*').order('detected_at', { ascending: false }),
      supabase.from('app_config').select('value').eq('key', 'last_refresh').single(),
    ]);

    const companies = companiesRes.data && companiesRes.data.length > 0
      ? companiesRes.data
      : [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);

    const signals = signalsRes.data && signalsRes.data.length > 0
      ? signalsRes.data
      : [...SEED_SIGNALS].sort(
          (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
        );

    const companiesWithSignals = companies.map((company: Record<string, unknown>) => ({
      ...company,
      signals: signals.filter((s: Record<string, unknown>) => s.company_id === company.id),
    }));

    const lastRefresh = configRes.data?.value || null;

    return NextResponse.json({ companiesWithSignals, lastRefresh });
  } catch {
    // Fall back to seed data
    const companies = [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);
    const signals = [...SEED_SIGNALS].sort(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
    const companiesWithSignals = companies.map((company) => ({
      ...company,
      signals: signals.filter((s) => s.company_id === company.id),
    }));
    return NextResponse.json({ companiesWithSignals, lastRefresh: null });
  }
}
