import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN || '';
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

interface CandidateRow {
  id: string;
  name: string;
  twitter_handle: string | null;
  github_username: string | null;
  [key: string]: unknown;
}

interface Tweet {
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

interface ClaudeSignal {
  signal_type: string;
  headline: string;
  detail: string;
  urgency: number;
}

interface ClaudeResponse {
  mobility_score: number;
  mobility_window: 'open' | 'uncertain' | 'closed';
  signals: ClaudeSignal[];
}

interface GitHubEvent {
  type: string;
  created_at: string;
}

// ── Twitter fetcher ──────────────────────────────────────────────────────────

async function fetchTweets(twitterHandle: string, errors: string[]): Promise<Tweet[]> {
  if (!twitterBearerToken || !twitterHandle) return [];

  try {
    const params = new URLSearchParams({
      query: `from:${twitterHandle}`,
      max_results: '10',
      'tweet.fields': 'created_at,text,public_metrics',
    });

    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      headers: {
        Authorization: `Bearer ${twitterBearerToken}`,
      },
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 429) {
        errors.push(`Twitter rate limit hit for @${twitterHandle}`);
      } else {
        errors.push(`Twitter API error for @${twitterHandle}: ${status}`);
      }
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    errors.push(`Twitter fetch failed for @${twitterHandle}: ${err instanceof Error ? err.message : 'unknown'}`);
    return [];
  }
}

// ── GitHub fetcher ───────────────────────────────────────────────────────────

async function fetchGitHubActivity(username: string, errors: string[]): Promise<{ signals: ClaudeSignal[] }> {
  if (!username) return { signals: [] };

  try {
    const res = await fetch(`https://api.github.com/users/${username}/events/public`, {
      headers: {
        'User-Agent': 'TalentRadar/1.0',
      },
    });

    if (!res.ok) {
      errors.push(`GitHub API error for ${username}: ${res.status}`);
      return { signals: [] };
    }

    const events: GitHubEvent[] = await res.json();
    const signals: ClaudeSignal[] = [];

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentEvents = events.filter((e) => new Date(e.created_at).getTime() > thirtyDaysAgo);
    const pushEvents = recentEvents.filter((e) => e.type === 'PushEvent');

    if (recentEvents.length === 0) {
      signals.push({
        signal_type: 'github_quiet',
        headline: `No public GitHub activity in 30+ days`,
        detail: `${username} has had no public events recently — possible disengagement or shift to private repos.`,
        urgency: 5,
      });
    } else if (pushEvents.length >= 5) {
      signals.push({
        signal_type: 'github_activity',
        headline: `Active GitHub contributions (${pushEvents.length} pushes in 30 days)`,
        detail: `${username} is actively contributing to public repos — ${recentEvents.length} total events.`,
        urgency: 3,
      });
    }

    return { signals };
  } catch (err) {
    errors.push(`GitHub fetch failed for ${username}: ${err instanceof Error ? err.message : 'unknown'}`);
    return { signals: [] };
  }
}

// ── Claude sentiment analysis ────────────────────────────────────────────────

async function analyzeTweetsWithClaude(tweets: Tweet[], errors: string[]): Promise<ClaudeResponse | null> {
  if (!anthropicApiKey || tweets.length === 0) return null;

  try {
    const tweetTexts = tweets.map((t) => `- ${t.text}`).join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are analyzing tweets from a software engineer to assess their job mobility likelihood.

Tweets from the past 2 months:
${tweetTexts}

Return ONLY a JSON object with no preamble:
{
  "mobility_score": <0-100 integer>,
  "mobility_window": <"open" | "uncertain" | "closed">,
  "sentiment_trend": <"improving" | "declining" | "stable">,
  "signals": [
    {
      "signal_type": <"sentiment_shift" | "topic_shift" | "job_search_language" | "engagement_drop">,
      "headline": <one sentence, max 12 words>,
      "detail": <one sentence explanation>,
      "urgency": <1-10 integer>
    }
  ],
  "summary": <one sentence max 20 words>
}`,
        }],
      }),
    });

    if (!res.ok) {
      errors.push(`Claude API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      errors.push('Claude response did not contain valid JSON');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ClaudeResponse;
    return parsed;
  } catch (err) {
    errors.push(`Claude analysis failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if we should only refresh a specific candidate
  let candidateFilter: string | null = null;
  try {
    const body = await request.json();
    candidateFilter = body.candidate_id || null;
  } catch {
    // No body or invalid JSON — refresh all candidates
  }

  // Fetch candidates
  let candidatesQuery = supabase.from('candidates').select('*');
  if (candidateFilter) {
    candidatesQuery = candidatesQuery.eq('id', candidateFilter);
  }
  const { data: candidates, error: candidatesError } = await candidatesQuery;

  if (candidatesError || !candidates) {
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }

  let totalNewSignals = 0;
  const errors: string[] = [];

  for (const candidate of candidates as CandidateRow[]) {
    try {
      // Fetch from Twitter and GitHub in parallel
      const [tweets, githubResult] = await Promise.all([
        fetchTweets(candidate.twitter_handle || '', errors),
        fetchGitHubActivity(candidate.github_username || '', errors),
      ]);

      // Analyze tweets with Claude
      const claudeResult = await analyzeTweetsWithClaude(tweets, errors);

      // Collect all signals
      const allSignals: Array<{
        candidate_id: string;
        signal_type: string;
        source: string;
        headline: string;
        detail: string;
        urgency: number;
        published_at: string;
      }> = [];

      // Add Claude-derived signals
      if (claudeResult) {
        for (const signal of claudeResult.signals) {
          allSignals.push({
            candidate_id: candidate.id,
            signal_type: signal.signal_type,
            source: 'twitter',
            headline: signal.headline,
            detail: signal.detail,
            urgency: Math.min(Math.max(signal.urgency, 1), 10),
            published_at: new Date().toISOString(),
          });
        }

        // Update candidate's mobility_score and mobility_window
        await supabase
          .from('candidates')
          .update({
            mobility_score: Math.min(Math.max(claudeResult.mobility_score, 0), 100),
            mobility_window: claudeResult.mobility_window,
            last_scanned_at: new Date().toISOString(),
          })
          .eq('id', candidate.id);
      }

      // Add GitHub signals
      for (const signal of githubResult.signals) {
        allSignals.push({
          candidate_id: candidate.id,
          signal_type: signal.signal_type,
          source: 'github',
          headline: signal.headline,
          detail: signal.detail,
          urgency: Math.min(Math.max(signal.urgency, 1), 10),
          published_at: new Date().toISOString(),
        });
      }

      // Insert signals
      for (const signal of allSignals) {
        const { error: insertError } = await supabase.from('candidate_signals').insert(signal);
        if (!insertError) {
          totalNewSignals++;
        } else {
          errors.push(`Failed to insert signal for ${candidate.name}: ${insertError.message}`);
        }
      }

      // Update last_scanned_at even if no Claude result
      if (!claudeResult) {
        await supabase
          .from('candidates')
          .update({ last_scanned_at: new Date().toISOString() })
          .eq('id', candidate.id);
      }
    } catch (err) {
      errors.push(`Error processing ${candidate.name}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  return NextResponse.json({
    candidates_checked: candidates.length,
    new_signals_added: totalNewSignals,
    sources: {
      twitter: twitterBearerToken ? 'active' : 'not configured',
      github: 'active (unauthenticated)',
      claude: anthropicApiKey ? 'active' : 'not configured',
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}
