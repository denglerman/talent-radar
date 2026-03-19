import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const newsApiKey = process.env.NEWS_API_KEY || '';
const perigonApiKey = process.env.PERIGON_API_KEY || '';

type SignalType = 'layoff' | 'acquisition' | 'leadership_change' | 'funding_round' | 'reorg' | 'culture';
type UrgencyLevel = 'high' | 'medium' | 'low';

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

interface TargetCompany {
  id: string;
  company_name: string;
  search_modifier: string | null;
  [key: string]: unknown;
}

interface NewSignal {
  company_id: string;
  signal_type: SignalType;
  headline: string;
  source_url: string | null;
  why_it_matters: string;
  urgency: UrgencyLevel;
  detected_at: string;
}

// Keywords that indicate an article is relevant to talent intelligence
const RELEVANCE_KEYWORDS = [
  // Hiring & Talent
  'engineer', 'engineering', 'team', 'hire', 'hiring', 'talent',
  'headcount', 'workforce', 'contractor', 'outsource', 'outsourcing',
  'offshore', 'remote', 'hybrid', 'hiring freeze', 'freeze',

  // Layoffs & Workforce Reduction
  'layoff', 'layoffs', 'job cut', 'jobs', 'staff', 'employees',
  'downsizing', 'rightsizing', 'furlough', 'redundant',

  // Restructuring & Org Changes
  'reorg', 'restructure', 'restructuring', 'reorganization',
  'pivot', 'spinoff', 'spin-off', 'divest', 'divestiture',
  'wind down', 'shut down', 'shutdown', 'discontinue', 'sunset',

  // Leadership & Culture
  'ceo', 'cto', 'cpo', 'chro', 'vp', 'founder', 'cofounder', 'co-founder',
  'president', 'fired', 'departed', 'resigned', 'resignation',
  'steps down', 'stepping down', 'exodus', 'turmoil', 'morale', 'culture',

  // M&A & Deals
  'acquisition', 'acquires', 'acquired', 'merger', 'partnership',
  'partners with', 'contract', 'deal',

  // Funding & Financial
  'raises', 'funding', 'pre-seed', 'seed', 'series a', 'series b',
  'series c', 'series d', 'series e', 'series f', 'series g',
  'growth round', 'late stage', 'pre-ipo', 'ipo', 'going public',
  'unicorn', 'valuation', 'valued at', 'down round', 'write-down',
  'writedown', 'runway', 'burn rate', 'bridge', 'bankruptcy',
  'bankrupt', 'insolvent', 'losses',

  // Growth & Product Signals
  'launched', 'launches', 'launch', 'shipped', 'released', 'release',
  'announced', 'breakthrough',

  // AI-Specific
  'ai-driven', 'ai-first', 'automation', 'automated', 'replace',
  'replaced', 'efficiency', 'productivity',

  // Return to Office
  'return to office', 'rto',
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

// ── Shared article filtering ──────────────────────────────────────────────────

function filterArticles(
  articles: NewsArticle[],
  companyName: string,
): NewsArticle[] {
  return articles.filter((article) => {
    if (!article.title || article.title === '[Removed]') return false;
    if (!headlineContainsCompanyName(article.title, companyName)) return false;
    if (!isRelevantToTalentIntelligence(article.title, article.description)) return false;
    return true;
  });
}

// ── NewsAPI fetcher ───────────────────────────────────────────────────────────

async function fetchNewsAPISignals(
  company: TargetCompany,
  errors: string[],
): Promise<NewsArticle[]> {
  if (!newsApiKey) return [];

  try {
    // Don't use search_modifier here — searchIn=title already restricts to title matches,
    // and adding the modifier (e.g. "app") would require it to appear in the title too,
    // filtering out virtually all legitimate articles. Perigon handles modifier separately.
    const query = `"${company.company_name}" AND (layoff OR acquisition OR restructuring OR "leadership change" OR funding OR reorg)`;
    const params = new URLSearchParams({
      q: query,
      sortBy: 'publishedAt',
      pageSize: '5',
      language: 'en',
      apiKey: newsApiKey,
    });
    // Always restrict to title search to avoid false positives from body text
    params.set('searchIn', 'title');

    const res = await fetch(`https://newsapi.org/v2/everything?${params}`);
    if (!res.ok) {
      errors.push(`NewsAPI error for ${company.company_name}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.articles || []).map((a: { title: string; description: string | null; url: string; publishedAt: string }) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      publishedAt: a.publishedAt,
    }));
  } catch (err) {
    errors.push(`NewsAPI fetch failed for ${company.company_name}: ${err instanceof Error ? err.message : 'unknown'}`);
    return [];
  }
}

// ── Perigon fetcher ───────────────────────────────────────────────────────────

async function fetchPerigonSignals(
  company: TargetCompany,
  errors: string[],
): Promise<NewsArticle[]> {
  if (!perigonApiKey) return [];

  try {
    // For modifier companies, append the search_modifier to the query
    const searchName = company.search_modifier
      ? `"${company.company_name}" ${company.search_modifier}`
      : `"${company.company_name}"`;

    const params = new URLSearchParams({
      q: searchName,
      category: 'tech',
      sortBy: 'date',
      size: '5',
      source: 'techcrunch.com,wired.com,theverge.com,bloomberg.com,reuters.com',
      apiKey: perigonApiKey,
    });

    const res = await fetch(`https://api.perigon.io/v1/articles/all?${params}`);
    if (!res.ok) {
      errors.push(`Perigon error for ${company.company_name}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    // Map Perigon response fields to NewsArticle shape
    return (data.articles || []).map((a: { title: string; description: string | null; url: string; pubDate: string }) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      publishedAt: a.pubDate,
    }));
  } catch (err) {
    errors.push(`Perigon fetch failed for ${company.company_name}: ${err instanceof Error ? err.message : 'unknown'}`);
    return [];
  }
}

// ── Merge & deduplicate ───────────────────────────────────────────────────────

function getWordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
}

function headlineSimilarity(a: string, b: string): number {
  const wordsA = getWordSet(a);
  const wordsB = getWordSet(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  const total = Math.max(wordsA.size, wordsB.size);
  return shared / total;
}

function mergeAndDedup(articles: NewsArticle[]): NewsArticle[] {
  // 1. Deduplicate by URL
  const seenUrls = new Set<string>();
  const urlDeduped: NewsArticle[] = [];
  for (const article of articles) {
    const url = article.url?.toLowerCase() || '';
    if (url && seenUrls.has(url)) continue;
    if (url) seenUrls.add(url);
    urlDeduped.push(article);
  }

  // 2. Deduplicate by headline similarity (80%+ word overlap -> keep earlier)
  const result: NewsArticle[] = [];
  for (const article of urlDeduped) {
    const existingIdx = result.findIndex(
      (existing) => headlineSimilarity(existing.title, article.title) >= 0.8,
    );
    if (existingIdx < 0) {
      result.push(article);
    } else {
      // Keep the one with the earlier publish date
      const existingDate = new Date(result[existingIdx].publishedAt).getTime();
      const newDate = new Date(article.publishedAt).getTime();
      if (newDate < existingDate) {
        result[existingIdx] = article;
      }
    }
  }

  return result;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  if (!newsApiKey && !perigonApiKey) {
    return NextResponse.json({ error: 'No news API keys configured (set NEWS_API_KEY and/or PERIGON_API_KEY)' }, { status: 500 });
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
  let totalPurged = 0;
  const errors: string[] = [];

  for (const company of companies) {
    try {
      // Fetch from both sources in parallel
      const [newsApiArticles, perigonArticles] = await Promise.all([
        fetchNewsAPISignals(company as TargetCompany, errors),
        fetchPerigonSignals(company as TargetCompany, errors),
      ]);

      // Merge and deduplicate across sources
      const allArticles = mergeAndDedup([...newsApiArticles, ...perigonArticles]);

      // Apply shared filters
      const filtered = filterArticles(allArticles, company.company_name);
      totalDiscarded += allArticles.length - filtered.length;

      // Build signal objects with in-batch headline dedup
      const newSignals: NewSignal[] = [];
      for (const article of filtered) {
        if (newSignals.some((s) => s.headline === article.title)) {
          totalDiscarded++;
          continue;
        }

        const signalType = classifySignalType(article.title);
        const urgency = getUrgency(signalType);
        const whyItMatters = getWhyItMatters(signalType, company.company_name);

        newSignals.push({
          company_id: company.id,
          signal_type: signalType,
          headline: article.title,
          source_url: article.url || null,
          why_it_matters: whyItMatters,
          urgency,
          detected_at: article.publishedAt || new Date().toISOString(),
        });
      }

      // Only purge old signals if at least one source returned results
      // (prevents data loss during transient API outages)
      if (newsApiArticles.length > 0 || perigonArticles.length > 0) {
        const { data: deleted, error: deleteError } = await supabase
          .from('signals')
          .delete()
          .eq('company_id', company.id)
          .select('id');
        if (deleteError) {
          errors.push(`Failed to purge signals for ${company.company_name}: ${deleteError.message}`);
          continue;
        }
        totalPurged += deleted?.length ?? 0;
      }

      for (const signal of newSignals) {
        const { error: insertError } = await supabase.from('signals').insert(signal);
        if (!insertError) {
          totalNewSignals++;
        } else {
          errors.push(`Failed to insert signal for ${company.company_name}: ${insertError.message}`);
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
    old_signals_purged: totalPurged,
    articles_discarded: totalDiscarded,
    sources: {
      newsapi: newsApiKey ? 'active' : 'not configured',
      perigon: perigonApiKey ? 'active' : 'not configured',
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}
