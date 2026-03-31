'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CandidateWithSignals, CandidateSignalType, CANDIDATE_SIGNAL_TYPE_LABELS, MobilityWindow } from '@/types';
import { Sparklines } from './Sparklines';

interface Props {
  candidate: CandidateWithSignals | null;
  onClose: () => void;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
}

function getUrgencyColor(urgency: number): string {
  if (urgency >= 7) return '#ef4444';
  if (urgency >= 4) return '#f59e0b';
  return '#00f5ff';
}

function getWindowColor(w: MobilityWindow): string {
  if (w === 'open') return '#10b981';
  if (w === 'uncertain') return '#f59e0b';
  return '#ef4444';
}

function getWindowLabel(w: MobilityWindow): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function getSignalBadgeColor(type: CandidateSignalType): string {
  const colors: Record<CandidateSignalType, string> = {
    sentiment_shift: '#ef4444',
    topic_shift: '#8b5cf6',
    engagement_drop: '#f59e0b',
    job_search_language: '#10b981',
    github_activity: '#3b82f6',
    github_quiet: '#ec4899',
  };
  return colors[type];
}

function getSourceBadge(source: string): { color: string; label: string } {
  if (source === 'twitter') return { color: '#1d9bf0', label: 'Twitter' };
  return { color: '#f0f6fc', label: 'GitHub' };
}

function MobilityGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const r = 50;
  const cx = 60;
  const cy = 55;

  const startAngle = Math.PI;
  const endAngle = startAngle - (angle * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);

  const largeArc = angle > 180 ? 1 : 0;

  const gaugeColor = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#00f5ff';

  return (
    <svg viewBox="0 0 120 70" className="w-32">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {score > 0 && (
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth="6"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${gaugeColor}80)`,
          }}
        />
      )}
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        fill={gaugeColor}
        fontSize="20"
        fontWeight="bold"
        fontFamily="var(--font-geist-mono), monospace"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="#475569"
        fontSize="8"
        fontFamily="var(--font-geist-mono), monospace"
      >
        MOBILITY
      </text>
    </svg>
  );
}

function SentimentSparkline() {
  // 8-week dummy sentiment data
  const data = [45, 52, 48, 60, 55, 72, 68, 75];
  return (
    <div className="mt-3">
      <div className="data-mono text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">
        Sentiment Trend (8w)
      </div>
      <div className="w-full h-8 bg-[#0d1117]/60 rounded border border-[#1e293b] p-1">
        <Sparklines data={data} color="#00f5ff" />
      </div>
    </div>
  );
}

export default function CandidateDetailPanel({ candidate, onClose, onDeleteCandidate }: Props) {
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);
  const confirmDelete = confirmDeleteFor === candidate?.id;

  const handleDelete = async () => {
    if (!candidate) return;
    setConfirmDeleteFor(null);
    onClose();
    await onDeleteCandidate(candidate.id);
  };

  return (
    <AnimatePresence>
      {candidate && (
        <motion.div
          key={candidate.id}
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-80 bg-[#0d1117]/80 border-l border-[#1e293b] flex flex-col h-full overflow-hidden backdrop-blur-sm"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#1e293b]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: candidate.mobility_score >= 70 ? '#ef4444' : candidate.mobility_score >= 40 ? '#f59e0b' : '#00f5ff' }}
                >
                  {candidate.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{candidate.name}</h2>
                  <div className="data-mono text-[10px] text-[#64748b]">
                    {candidate.current_role} @ {candidate.current_company}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setConfirmDeleteFor(candidate.id)}
                  className="text-[#334155] hover:text-[#ef4444] transition-colors p-1"
                  title="Delete candidate"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 4h8M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M10.5 4l-.5 7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3.5 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  className="text-[#475569] hover:text-white transition-colors p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            <AnimatePresence>
              {confirmDelete && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 py-2 px-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-center justify-between"
                >
                  <span className="data-mono text-[10px] text-[#ef4444]">Delete this candidate?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="data-mono text-[10px] text-[#ef4444] hover:text-white transition-colors font-semibold"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteFor(null)}
                      className="data-mono text-[10px] text-[#64748b] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobility gauge + window */}
            <div className="flex items-center justify-between">
              <MobilityGauge score={candidate.mobility_score} />
              <div className="text-right">
                <div className="data-mono text-[10px] text-[#475569] uppercase tracking-wider mb-1">
                  Mobility Window
                </div>
                <span
                  className="data-mono text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    color: getWindowColor(candidate.mobility_window),
                    backgroundColor: `${getWindowColor(candidate.mobility_window)}15`,
                    border: `1px solid ${getWindowColor(candidate.mobility_window)}40`,
                  }}
                >
                  {getWindowLabel(candidate.mobility_window)}
                </span>
              </div>
            </div>

            <SentimentSparkline />

            {/* Social links */}
            <div className="flex items-center gap-2 mt-3">
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-mono text-[10px] text-[#0a66c2] border border-[#0a66c2]/30 rounded px-2 py-1 hover:bg-[#0a66c2]/10 transition-colors"
                >
                  LinkedIn
                </a>
              )}
              {candidate.twitter_handle && (
                <a
                  href={`https://twitter.com/${candidate.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-mono text-[10px] text-[#1d9bf0] border border-[#1d9bf0]/30 rounded px-2 py-1 hover:bg-[#1d9bf0]/10 transition-colors"
                >
                  Twitter
                </a>
              )}
              {candidate.github_username && (
                <a
                  href={`https://github.com/${candidate.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data-mono text-[10px] text-[#f0f6fc] border border-[#f0f6fc]/30 rounded px-2 py-1 hover:bg-[#f0f6fc]/10 transition-colors"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* Signals list */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="data-mono text-[10px] text-[#64748b] uppercase tracking-widest mb-3">
              Signals ({candidate.signals.length})
            </h3>

            <div className="space-y-3">
              {[...candidate.signals]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((signal, i) => {
                  const badgeColor = getSignalBadgeColor(signal.signal_type);
                  const urgColor = getUrgencyColor(signal.urgency);
                  const sourceBadge = getSourceBadge(signal.source);

                  return (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="block bg-[#111827]/60 border border-[#1e293b] rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="data-mono text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${badgeColor}20`,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}40`,
                          }}
                        >
                          {CANDIDATE_SIGNAL_TYPE_LABELS[signal.signal_type]}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="data-mono text-[8px] px-1 py-0.5 rounded"
                            style={{
                              color: sourceBadge.color,
                              backgroundColor: `${sourceBadge.color}15`,
                              border: `1px solid ${sourceBadge.color}30`,
                            }}
                          >
                            {sourceBadge.label}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: urgColor }}
                          />
                          <span className="data-mono text-[9px]" style={{ color: urgColor }}>
                            {signal.urgency}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#e2e8f0] leading-relaxed mb-1.5">
                        {signal.headline}
                      </p>
                      {signal.detail && (
                        <p className="text-[10px] text-[#64748b] leading-relaxed italic">
                          {signal.detail}
                        </p>
                      )}
                      <div className="data-mono text-[9px] text-[#334155] mt-1.5">
                        {signal.published_at ? new Date(signal.published_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : 'Unknown date'}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
