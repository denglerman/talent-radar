import { SEED_COMPANIES, SEED_SIGNALS } from '@/lib/seed-data';
import { CompanyWithSignals } from '@/types';
import Dashboard from '@/components/Dashboard';

async function getData(): Promise<CompanyWithSignals[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const companiesRes = await fetch(`${supabaseUrl}/rest/v1/target_companies?select=*&order=heat_score.desc`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 60 },
      });

      if (companiesRes.ok) {
        const companies = await companiesRes.json();
        if (companies && companies.length > 0) {
          const signalsRes = await fetch(`${supabaseUrl}/rest/v1/signals?select=*&order=detected_at.desc`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            next: { revalidate: 60 },
          });

          const signals = signalsRes.ok ? await signalsRes.json() : [];

          return companies.map((company: CompanyWithSignals) => ({
            ...company,
            signals: signals.filter((s: { company_id: string }) => s.company_id === company.id),
          }));
        }
      }
    }
  } catch {
    // Fall through to seed data
  }

  const companies = [...SEED_COMPANIES].sort((a, b) => b.heat_score - a.heat_score);
  const signals = [...SEED_SIGNALS].sort(
    (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  );

  return companies.map((company) => ({
    ...company,
    signals: signals.filter((s) => s.company_id === company.id),
  }));
}

export default async function Home() {
  const companiesWithSignals = await getData();

  return <Dashboard companiesWithSignals={companiesWithSignals} />;
}
