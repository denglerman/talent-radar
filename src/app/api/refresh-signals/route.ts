import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const newsApiKey = process.env.NEWS_API_KEY || '';

type SignalType = 'layoff' | 'acquisition' | 'leadership_change' | 'funding_round' | 'reorg' | 'culture';
type UrgencyLevel = 'high' | 'medium' | 'low';

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

// Keywords that indicate an article is relevant to talent intelligence
const RELEVANCE_KEYWORDS = [
  'engineer', 'engineering', 'team', 'hire', 'hiring', 'talent',
  'layoff', 'cut', 'jobs', 'staff', 'employees',
  'acquisition', 'acquires', 'acquired', 'merger',
  'ceo', 'cto', 'vp', 'raises', 'funding', 'series',
  'reorg', 'restructur', 'leadership',
];

function classifySignalType(headline: string): SignalType {
  const lower = headline.toLowerCase();
  if (lower.includes('layoff') || lower.includes('job cut') || lower.includes('fired') || lower.includes('laying off') || lower.includes('job cuts') || lower.includes('cuts jobs') || lower.includes('cut jobs')) return 'layoff';
  if (lower.includes('acqui') || lower.includes('merger') || lower.includes('bought') || lower.includes('acquire')) return 'acquisition';
  if (lower.includes('ceo') || lower.includes('cto') || lower.includes('vp') || lower.includes('chief') || lower.includes('appoints') || lower.includes('steps down') || lower.includes('resign')) return 'leadership_change';
  if (lower.includes('raises') || lower.includes('funding') || lower.includes('million') || lower.includes('billion') || lower.includes('series')) return 'funding_round';
  if (lower.includes('reorg') || lower.includes('restructur')) return 'reorg';
  return 'culture';
}

function getUrgency(signalType: SignalType): UrgencyLevel {
  if (signalType === 'layoff' || signalType === 'acquisition' || signalType === 'reorg') return 'high';
  if (signalType === 'leadership_change') return 'medium';
  return 'low';
}

function getWhyItMatters(signalType: SignalType, companyName: string): string {
  const templates: Record<SignalType, string> = {
    layoff: `${companyName} is reducing headcount — engineers here may be actively looking or open to conversations soon.`,
    acquisition: `${companyName} is being acquired — culture shifts and uncertainty often trigger departures within 3-6 months.`,
    leadership_change: `Leadership transition at ${companyName} — engineers often reassess when key leaders change.`,
    funding_round: `${companyName} just raised — their team is growing but top performers may feel the culture shifting.`,
    reorg: `Reorganization at ${companyName} — uncertainty and role changes make this a good time to reach out.`,
    culture: `Notable news at ${companyName} — worth monitoring for downstream talent movement.`,
  };
  return templates[signalType];
}

function calculateHeatScore(signals: Array<{ urgency: string; detected_at: string }>): number {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let score = 0;

  for (const signal of signals) {
    const age = now - new Date(signal.detected_at).getTime();
    if (age <= thirtyDaysMs) {
      if (signal.urgency === 'high') score += 30;
      else if (signal.urgency === 'medium') score += 15;
      else score += 5;
    }
  }

  return Math.min(score, 100);
}

function getRecruitingWindow(heatScore: number): 'open' | 'uncertain' | 'closed' {
  if (heatScore >= 70) return 'open';
  if (heatScore >= 40) return 'uncertain';
  return 'closed';
}

function headlineContainsCompanyName(headline: string, companyName: string): boolean {
  return headline.toLowerCase().includes(companyName.toLowerCase());
}

function isRelevantToTalentIntelligence(headline: string, description: string | null): boolean {
  const text = `${headline} ${description || ''}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some((keyword) => text.includes(keyword));
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  if (!newsApiKey) {
    return NextResponse.json({ error: 'NEWS_API_KEY not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if we should only refresh a specific company
  let companyFilter: string | null = null;
  try {
    const body = await request.json();
    companyFilter = body.company_id || null;
  } catch {
    // No body or invalid JSON — refresh all companies
  }

  // Fetch companies
  let companiesQuery = supabase.from('target_companies').select('*');
  if (companyFilter) {
    companiesQuery = companiesQuery.eq('id', companyFilter);
  }
  const { data: companies, error: companiesError } = await companiesQuery;

  if (companiesError || !companies) {
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }

  let totalNewSignals = 0;
  let totalDiscarded = 0;
  const errors: string[] = [];

  for (const company of companies) {
    try {
      // Build search query — append search_modifier for generic company names
      const searchName = company.search_modifier
        ? `"${company.company_name}" ${company.search_modifier}`
        : `"${company.company_name}"`;
      const query = `${searchName} AND (layoff OR acquisition OR restructuring OR "leadership change" OR funding OR reorg)`;
      const params = new URLSearchParams({
        q: query,
        searchIn: 'title',
        sortBy: 'publishedAt',
        pageSize: '5',
        language: 'en',
        apiKey: newsApiKey,
      });

      const newsRes = await fetch(`https://newsapi.org/v2/everything?${params}`);
      if (!newsRes.ok) {
        errors.push(`NewsAPI error for ${company.company_name}: ${newsRes.status}`);
        continue;
      }

      const newsData = await newsRes.json();
      const articles: NewsArticle[] = newsData.articles || [];

      for (const article of articles) {
        if (!article.title || article.title === '[Removed]') continue;

        // Filter 1: headline must contain the company name
        if (!headlineContainsCompanyName(article.title, company.company_name)) {
          totalDiscarded++;
          continue;
        }

        // Filter 2: article must contain at least one talent-relevant keyword
        if (!isRelevantToTalentIntelligence(article.title, article.description)) {
          totalDiscarded++;
          continue;
        }

        // Check for duplicate headline
        const { data: existing } = await supabase
          .from('signals')
          .select('id')
          .eq('company_id', company.id)
          .eq('headline', article.title)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const signalType = classifySignalType(article.title);
        const urgency = getUrgency(signalType);
        const whyItMatters = getWhyItMatters(signalType, company.company_name);

        const { error: insertError } = await supabase.from('signals').insert({
          company_id: company.id,
          signal_type: signalType,
          headline: article.title,
          source_url: article.url || null,
          why_it_matters: whyItMatters,
          urgency,
          detected_at: article.publishedAt || new Date().toISOString(),
        });

        if (!insertError) {
          totalNewSignals++;
        }
      }

      // Recalculate heat score for this company
      const { data: allSignals } = await supabase
        .from('signals')
        .select('urgency, detected_at')
        .eq('company_id', company.id);

      if (allSignals) {
        const heatScore = calculateHeatScore(allSignals);
        const recruitingWindow = getRecruitingWindow(heatScore);

        await supabase
          .from('target_companies')
          .update({ heat_score: heatScore, recruiting_window: recruitingWindow })
          .eq('id', company.id);
      }
    } catch (err) {
      errors.push(`Error processing ${company.company_name}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  // Update last refresh timestamp in app_config
  await supabase
    .from('app_config')
    .upsert({ key: 'last_refresh', value: new Date().toISOString() }, { onConflict: 'key' });

  return NextResponse.json({
    companies_checked: companies.length,
    new_signals_added: totalNewSignals,
    articles_discarded: totalDiscarded,
    errors: errors.length > 0 ? errors : undefined,
  });
}
