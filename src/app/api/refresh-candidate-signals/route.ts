import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface TwitterTweet {
  text: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

interface GitHubEvent {
  type: string;
  created_at: string;
}

interface ClaudeSignal {
  signal_type: 'sentiment_shift' | 'topic_shift' | 'engagement_drop' | 'job_search_language';
  headline: string;
  detail: string;
  urgency: number;
}

interface ClaudeAnalysis {
  mobility_score: number;
  mobility_window: 'open' | 'uncertain' | 'closed';
  signals: ClaudeSignal[];
}

interface CandidateRow {
  id: string;
  name: string;
  twitter_handle: string | null;
  github_username: string | null;
}

async function fetchTwitterSignals(handle: string): Promise<TwitterTweet[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken || !handle) return [];

  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=from:${encodeURIComponent(handle)}&max_results=10&tweet.fields=created_at,text,public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      }
    );

    if (!res.ok) {
      console.log(`Twitter API error for @${handle}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.log(`Twitter fetch failed for @${handle}:`, err);
    return [];
  }
}

async function fetchGitHubActivity(username: string): Promise<{ events: GitHubEvent[]; isQuiet: boolean }> {
  if (!username) return { events: [], isQuiet: false };

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
      headers: {
        'User-Agent': 'CognitionTalentRadar/1.0',
      },
    });

    if (!res.ok) {
      console.log(`GitHub API error for ${username}: ${res.status}`);
      return { events: [], isQuiet: false };
    }

    const events: GitHubEvent[] = await res.json();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentEvents = events.filter(
      (e) => new Date(e.created_at).getTime() > thirtyDaysAgo
    );

    return {
      events: recentEvents,
      isQuiet: recentEvents.length === 0,
    };
  } catch (err) {
    console.log(`GitHub fetch failed for ${username}:`, err);
    return { events: [], isQuiet: false };
  }
}

async function analyzeWithClaude(tweets: TwitterTweet[]): Promise<ClaudeAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || tweets.length === 0) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are analyzing tweets from a software engineer to assess their job mobility likelihood.

Tweets from the past 2 months:
${tweets.map((t) => `- ${t.text}`).join('\n')}

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
          },
        ],
      }),
    });

    if (!res.ok) {
      console.log(`Claude API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ClaudeAnalysis;
    return parsed;
  } catch (err) {
    console.log('Claude analysis failed:', err);
    return null;
  }
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Optionally filter to a single candidate
  let candidateIdFilter: string | null = null;
  try {
    const body = await request.json();
    candidateIdFilter = body.candidate_id || null;
  } catch {
    // No body provided — refresh all
  }

  // Fetch candidates
  let query = supabase.from('candidates').select('id, name, twitter_handle, github_username');
  if (candidateIdFilter) {
    query = query.eq('id', candidateIdFilter);
  }
  const { data: candidates, error: fetchError } = await query;

  if (fetchError || !candidates) {
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }

  let totalSignalsAdded = 0;
  let totalPurged = 0;
  const errors: string[] = [];

  for (const candidate of candidates as CandidateRow[]) {
    try {
      // Fetch Twitter and GitHub signals in parallel
      const [tweets, githubResult] = await Promise.all([
        fetchTwitterSignals(candidate.twitter_handle || ''),
        fetchGitHubActivity(candidate.github_username || ''),
      ]);

      const newSignals: {
        candidate_id: string;
        signal_type: string;
        source: string;
        headline: string;
        detail: string | null;
        urgency: number;
        published_at: string;
      }[] = [];

      // Analyze tweets with Claude
      const claudeResult = await analyzeWithClaude(tweets);

      if (claudeResult) {
        // Update candidate mobility score and window
        await supabase
          .from('candidates')
          .update({
            mobility_score: claudeResult.mobility_score,
            mobility_window: claudeResult.mobility_window,
            last_scanned_at: new Date().toISOString(),
          })
          .eq('id', candidate.id);

        // Add Claude-detected signals
        for (const signal of claudeResult.signals) {
          newSignals.push({
            candidate_id: candidate.id,
            signal_type: signal.signal_type,
            source: 'twitter',
            headline: signal.headline,
            detail: signal.detail,
            urgency: signal.urgency,
            published_at: new Date().toISOString(),
          });
        }
      }

      // Add GitHub signals
      if (candidate.github_username) {
        if (githubResult.isQuiet) {
          newSignals.push({
            candidate_id: candidate.id,
            signal_type: 'github_quiet',
            source: 'github',
            headline: `No public GitHub activity in 30 days`,
            detail: `${candidate.name} has had no public commits or activity on GitHub in the past 30 days.`,
            urgency: 5,
            published_at: new Date().toISOString(),
          });
        } else if (githubResult.events.length > 0) {
          newSignals.push({
            candidate_id: candidate.id,
            signal_type: 'github_activity',
            source: 'github',
            headline: `${githubResult.events.length} public events in past 30 days`,
            detail: `Active on GitHub with ${githubResult.events.length} recent public events.`,
            urgency: 3,
            published_at: new Date().toISOString(),
          });
        }
      }

      // Purge old signals and insert new ones
      if (newSignals.length > 0) {
        const { data: deleted, error: deleteError } = await supabase
          .from('candidate_signals')
          .delete()
          .eq('candidate_id', candidate.id)
          .select('id');

        if (deleteError) {
          errors.push(`Failed to purge signals for ${candidate.name}: ${deleteError.message}`);
          continue;
        }

        totalPurged += deleted?.length ?? 0;

        const { error: insertError } = await supabase
          .from('candidate_signals')
          .insert(newSignals);

        if (insertError) {
          errors.push(`Failed to insert signals for ${candidate.name}: ${insertError.message}`);
        } else {
          totalSignalsAdded += newSignals.length;
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
      errors.push(`Error processing ${candidate.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    candidates_scanned: candidates.length,
    old_signals_purged: totalPurged,
    new_signals_added: totalSignalsAdded,
    errors: errors.length > 0 ? errors : undefined,
  });
}
