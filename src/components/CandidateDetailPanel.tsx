'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CandidateWithSignals, CandidateSignalType, CandidateSignalSource, MobilityWindow, CANDIDATE_SIGNAL_TYPE_LABELS } from '@/types';
import { Sparklines } from './Sparklines';

interface Props {
  candidate: CandidateWithSignals | null;
  onClose: () => void;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onEditCandidate: (candidateId: string, data: Record<string, string>) => Promise<void>;
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

function getSourceColor(source: CandidateSignalSource): string {
  if (source === 'twitter') return '#1d9bf0';
  return '#8b5cf6';
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

function SentimentSparkline({ signals }: { signals: CandidateWithSignals['signals'] }) {
  // Generate 8-week sentiment trend from signal urgency data
  const weeks = 8;
  const data: number[] = [];
  const now = Date.now();

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = now - w * 7 * 24 * 60 * 60 * 1000;
    const weekSignals = signals.filter((s) => {
      const t = new Date(s.published_at || '').getTime();
      return t >= weekStart && t < weekEnd;
    });

    if (weekSignals.length > 0) {
      const avgUrgency = weekSignals.reduce((sum, s) => sum + s.urgency, 0) / weekSignals.length;
      data.push(avgUrgency);
    } else {
      data.push(0);
    }
  }

  return (
    <div>
      <div className="data-mono text-[10px] text-[#475569] uppercase tracking-wider mb-1">
        Sentiment Trend (8 weeks)
      </div>
      <div className="w-full h-8">
        <Sparklines data={data} color="#f59e0b" />
      </div>
    </div>
  );
}

export default function CandidateDetailPanel({ candidate, onClose, onDeleteCandidate, onEditCandidate }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);

  const savingForRef = useRef<string | null>(null);

  useEffect(() => {
    setConfirmDelete(false);
    setEditing(false);
    setSaving(false);
    savingForRef.current = null;
  }, [candidate?.id]);

  const handleDelete = async () => {
    if (!candidate) return;
    setConfirmDelete(false);
    onClose();
    await onDeleteCandidate(candidate.id);
  };

  const handleStartEdit = () => {
    if (!candidate) return;
    setEditName(candidate.name);
    setEditCompany(candidate.current_company || '');
    setEditRole(candidate.current_role || '');
    setEditing(true);
    setConfirmDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!candidate || !editName.trim()) return;
    const targetId = candidate.id;
    savingForRef.current = targetId;
    setSaving(true);
    await onEditCandidate(candidate.id, {
      name: editName.trim(),
      current_company: editCompany.trim(),
      current_role: editRole.trim(),
    });
    if (savingForRef.current === targetId) {
      setSaving(false);
      setEditing(false);
    }
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
                  className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: candidate.mobility_score >= 70 ? '#ef4444' : candidate.mobility_score >= 40 ? '#f59e0b' : '#00f5ff',
                    fontSize: 11,
                  }}
                >
                  {candidate.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{candidate.name}</h2>
                  {candidate.current_role && (
                    <div className="text-[10px] text-[#64748b]">
                      {candidate.current_role}{candidate.current_company ? ` @ ${candidate.current_company}` : ''}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={handleStartEdit} className="text-[#334155] hover:text-[#00f5ff] transition-colors p-1" title="Edit candidate">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10 2l2 2-7 7H3v-2l7-7z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button onClick={() => setConfirmDelete(true)} className="text-[#334155] hover:text-[#ef4444] transition-colors p-1" title="Delete candidate">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 4h8M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M10.5 4l-.5 7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3.5 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button onClick={onClose} className="text-[#475569] hover:text-white transition-colors p-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Edit form */}
            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 py-2.5 px-3 bg-[#00f5ff]/5 border border-[#00f5ff]/20 rounded-lg"
                >
                  <div className="space-y-2">
                    <div>
                      <label className="data-mono text-[9px] text-[#475569] uppercase tracking-wider">Name</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1.5 bg-[#0d1117] border border-[#1e293b] rounded text-[11px] text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="data-mono text-[9px] text-[#475569] uppercase tracking-wider">Company</label>
                      <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1.5 bg-[#0d1117] border border-[#1e293b] rounded text-[11px] text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="data-mono text-[9px] text-[#475569] uppercase tracking-wider">Role</label>
                      <input type="text" value={editRole} onChange={(e) => setEditRole(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1.5 bg-[#0d1117] border border-[#1e293b] rounded text-[11px] text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="data-mono text-[10px] text-[#00f5ff] hover:text-white transition-colors font-semibold disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditing(false)} className="data-mono text-[10px] text-[#64748b] hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                    <button onClick={handleDelete} className="data-mono text-[10px] text-[#ef4444] hover:text-white transition-colors font-semibold">Yes, delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="data-mono text-[10px] text-[#64748b] hover:text-white transition-colors">Cancel</button>
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

            {/* Sentiment sparkline */}
            <div className="mt-3">
              <SentimentSparkline signals={candidate.signals} />
            </div>

            {/* Social links */}
            <div className="flex gap-2 mt-3">
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 data-mono text-[10px] text-[#0a66c2] hover:text-[#0a66c2]/80 transition-colors border border-[#0a66c2]/30 rounded px-2 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
              )}
              {candidate.twitter_handle && (
                <a href={`https://twitter.com/${candidate.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 data-mono text-[10px] text-[#1d9bf0] hover:text-[#1d9bf0]/80 transition-colors border border-[#1d9bf0]/30 rounded px-2 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @{candidate.twitter_handle}
                </a>
              )}
              {candidate.github_username && (
                <a href={`https://github.com/${candidate.github_username}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 data-mono text-[10px] text-[#8b5cf6] hover:text-[#8b5cf6]/80 transition-colors border border-[#8b5cf6]/30 rounded px-2 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* Signals list */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="data-mono text-[10px] text-[#64748b] uppercase tracking-widest mb-3">
              Active Signals ({candidate.signals.length})
            </h3>

            <div className="space-y-3">
              {[...candidate.signals]
                .sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime())
                .map((signal, i) => {
                  const typeColor = getSignalTypeColor(signal.signal_type);
                  const urgColor = getUrgencyColor(signal.urgency);
                  const sourceColor = getSourceColor(signal.source);

                  return (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="bg-[#111827]/60 border border-[#1e293b] rounded-lg p-3 hover:border-[#334155] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
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
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: urgColor }} />
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
                      {signal.published_at && (
                        <div className="data-mono text-[9px] text-[#334155] mt-1.5">
                          {new Date(signal.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      )}
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
