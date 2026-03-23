import { SEED_COMPANIES, SEED_SIGNALS, SEED_CANDIDATES, SEED_CANDIDATE_SIGNALS } from '@/lib/seed-data';
import { CompanyWithSignals, CandidateWithSignals } from '@/types';
import Dashboard from '@/components/Dashboard';

async function getData(): Promise<{ companiesWithSignals: CompanyWithSignals[]; lastRefresh: string | null }> {
  let lastRefresh: string | null = null;

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

          // Fetch last refresh time
          try {
            const configRes = await fetch(`${supabaseUrl}/rest/v1/app_config?key=eq.last_refresh&select=value`, {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              next: { revalidate: 0 },
            });
            if (configRes.ok) {
              const configRows = await configRes.json();
              if (configRows.length > 0) lastRefresh = configRows[0].value;
            }
          } catch {
            // ignore
          }

          return {
            companiesWithSignals: companies.map((company: CompanyWithSignals) => ({
              ...company,
              signals: signals.filter((s: { company_id: string }) => s.company_id === company.id),
            })),
            lastRefresh,
          };
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

  return {
    companiesWithSignals: companies.map((company) => ({
      ...company,
      signals: signals.filter((s) => s.company_id === company.id),
    })),
    lastRefresh: null,
  };
}

async function getCandidateData(): Promise<CandidateWithSignals[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const candidatesRes = await fetch(`${supabaseUrl}/rest/v1/candidates?select=*&order=mobility_score.desc`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 60 },
      });

      if (candidatesRes.ok) {
        const candidates = await candidatesRes.json();
        if (candidates && candidates.length > 0) {
          const signalsRes = await fetch(`${supabaseUrl}/rest/v1/candidate_signals?select=*&order=published_at.desc`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            next: { revalidate: 60 },
          });

          const signals = signalsRes.ok ? await signalsRes.json() : [];

          return candidates.map((candidate: CandidateWithSignals) => ({
            ...candidate,
            signals: signals.filter((s: { candidate_id: string }) => s.candidate_id === candidate.id),
          }));
        }
      }
    }
  } catch {
    // Fall through to seed data
  }

  const candidates = [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);
  const signals = [...SEED_CANDIDATE_SIGNALS].sort(
    (a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime()
  );

  return candidates.map((candidate) => ({
    ...candidate,
    signals: signals.filter((s) => s.candidate_id === candidate.id),
  }));
}

export default async function Home() {
  const [companyData, candidateData] = await Promise.all([getData(), getCandidateData()]);
  const { companiesWithSignals, lastRefresh } = companyData;

  return (
    <Dashboard
      companiesWithSignals={companiesWithSignals}
      initialLastRefresh={lastRefresh}
      initialCandidates={candidateData}
    />
  );
}
