'use client';

import { motion } from 'framer-motion';
import { CandidateSignal, Candidate, CandidateSignalType, CandidateSignalSource, CANDIDATE_SIGNAL_TYPE_LABELS } from '@/types';

interface Props {
  signals: CandidateSignal[];
  candidates: Candidate[];
}

function getUrgencyColor(urgency: number): string {
  if (urgency >= 7) return '#ef4444';
  if (urgency >= 4) return '#f59e0b';
  return '#00f5ff';
}

function getSignalTypeColor(type: CandidateSignalType): string {
  const colors: Record<CandidateSignalType, string> = {
    sentiment_shift: '#ef4444',
    topic_shift: '#f59e0b',
    engagement_drop: '#ec4899',
    job_search_language: '#10b981',
    github_activity: '#8b5cf6',
    github_quiet: '#64748b',
  };
  return colors[type];
}

function getSourceColor(source: CandidateSignalSource): string {
  if (source === 'twitter') return '#1d9bf0';
  return '#8b5cf6';
}

function timeAgo(date: string | null): string {
  if (!date) return 'Unknown';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CandidateSignalTimeline({ signals, candidates }: Props) {
  const sorted = [...signals].sort(
    (a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime()
  );

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="h-full"
    >
      <h3 className="data-mono text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-3">
        Candidate Signal Feed
      </h3>

      <div className="relative overflow-y-auto max-h-[380px] pr-2">
        {/* Center line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#1e293b]" />

        {sorted.map((signal, i) => {
          const candidate = candidateMap.get(signal.candidate_id);
          const urgColor = getUrgencyColor(signal.urgency);
          const typeColor = getSignalTypeColor(signal.signal_type);
          const sourceColor = getSourceColor(signal.source);

          return (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.06, duration: 0.4 }}
              className="relative pl-10 pb-4"
            >
              {/* Node dot */}
              <div
                className="absolute left-[11px] top-1 w-[10px] h-[10px] rounded-full border-2"
                style={{
                  borderColor: urgColor,
                  backgroundColor: `${urgColor}33`,
                  boxShadow: `0 0 8px ${urgColor}66`,
                }}
              />

              <div className="bg-[#0d1117]/80 border border-[#1e293b] rounded-lg p-3 hover:border-[#334155] transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {candidate && (
                      <div
                        className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: urgColor,
                          fontSize: 7,
                        }}
                      >
                        {candidate.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                      </div>
                    )}
                    <span className="data-mono text-[11px] text-[#e2e8f0] font-medium">
                      {candidate?.name || 'Unknown'}
                    </span>
                  </div>
                  <span className="data-mono text-[10px] text-[#475569]">
                    {timeAgo(signal.published_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="data-mono text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${typeColor}20`,
                      color: typeColor,
                      border: `1px solid ${typeColor}40`,
                    }}
                  >
                    {CANDIDATE_SIGNAL_TYPE_LABELS[signal.signal_type]}
                  </span>
                  <span
                    className="data-mono text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${sourceColor}15`,
                      color: sourceColor,
                      border: `1px solid ${sourceColor}30`,
                    }}
                  >
                    {signal.source === 'twitter' ? 'Twitter' : 'GitHub'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: urgColor }} />
                </div>

                <p className="text-[11px] text-[#94a3b8] leading-relaxed line-clamp-2">
                  {signal.headline}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
