import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_CANDIDATES, SEED_CANDIDATE_SIGNALS } from '@/lib/seed-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    // Return seed data
    const candidates = [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);
    const signals = [...SEED_CANDIDATE_SIGNALS].sort(
      (a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime()
    );
    const candidatesWithSignals = candidates.map((candidate) => ({
      ...candidate,
      signals: signals.filter((s) => s.candidate_id === candidate.id),
    }));
    return NextResponse.json({ candidatesWithSignals });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const [candidatesRes, signalsRes] = await Promise.all([
      supabase.from('candidates').select('*').order('mobility_score', { ascending: false }),
      supabase.from('candidate_signals').select('*').order('published_at', { ascending: false }),
    ]);

    const candidates = candidatesRes.data && candidatesRes.data.length > 0
      ? candidatesRes.data
      : [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);

    const signals = signalsRes.data && signalsRes.data.length > 0
      ? signalsRes.data
      : [...SEED_CANDIDATE_SIGNALS].sort(
          (a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime()
        );

    const candidatesWithSignals = candidates.map((candidate: Record<string, unknown>) => ({
      ...candidate,
      signals: signals.filter((s: Record<string, unknown>) => s.candidate_id === candidate.id),
    }));

    return NextResponse.json({ candidatesWithSignals });
  } catch {
    // Fall back to seed data
    const candidates = [...SEED_CANDIDATES].sort((a, b) => b.mobility_score - a.mobility_score);
    const signals = [...SEED_CANDIDATE_SIGNALS].sort(
      (a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime()
    );
    const candidatesWithSignals = candidates.map((candidate) => ({
      ...candidate,
      signals: signals.filter((s) => s.candidate_id === candidate.id),
    }));
    return NextResponse.json({ candidatesWithSignals });
  }
}
