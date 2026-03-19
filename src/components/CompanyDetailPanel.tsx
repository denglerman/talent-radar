'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompanyWithSignals, SIGNAL_TYPE_LABELS, SignalType, UrgencyLevel, RecruitingWindow } from '@/types';
import CompanyLogo from './CompanyLogo';

interface Props {
  company: CompanyWithSignals | null;
  onClose: () => void;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onEditCompany: (companyId: string, name: string, domain: string) => Promise<void>;
}

function getUrgencyColor(urgency: UrgencyLevel): string {
  if (urgency === 'high') return '#ef4444';
  if (urgency === 'medium') return '#f59e0b';
  return '#00f5ff';
}

function getUrgencyLabel(urgency: UrgencyLevel): string {
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}

function getWindowColor(w: RecruitingWindow): string {
  if (w === 'open') return '#10b981';
  if (w === 'uncertain') return '#f59e0b';
  return '#ef4444';
}

function getWindowLabel(w: RecruitingWindow): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function getSignalBadgeColor(type: SignalType): string {
  const colors: Record<SignalType, string> = {
    layoff: '#ef4444',
    acquisition: '#8b5cf6',
    leadership_change: '#f59e0b',
    funding_round: '#10b981',
    reorg: '#3b82f6',
    culture: '#ec4899',
  };
  return colors[type];
}

function HeatGauge({ score }: { score: number }) {
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
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Value arc */}
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
      {/* Score text */}
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
        HEAT SCORE
      </text>
    </svg>
  );
}

export default function CompanyDetailPanel({ company, onClose, onDeleteCompany, onEditCompany }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state when company changes (fixes confirmDelete leak across selections)
  useEffect(() => {
    setConfirmDelete(false);
    setEditing(false);
  }, [company?.id]);

  const handleDelete = async () => {
    if (!company) return;
    setConfirmDelete(false);
    onClose();
    await onDeleteCompany(company.id);
  };

  const handleStartEdit = () => {
    if (!company) return;
    setEditName(company.company_name);
    setEditDomain(company.domain);
    setEditing(true);
    setConfirmDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!company || !editName.trim() || !editDomain.trim()) return;
    setSaving(true);
    await onEditCompany(company.id, editName.trim(), editDomain.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  return (
    <AnimatePresence>
      {company && (
        <motion.div
          key={company.id}
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
                <CompanyLogo
                  domain={company.domain}
                  companyName={company.company_name}
                  size={24}
                  heatColor={company.heat_score >= 70 ? '#ef4444' : company.heat_score >= 40 ? '#f59e0b' : '#00f5ff'}
                />
                <h2 className="text-sm font-semibold text-white">{company.company_name}</h2>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Edit button */}
                <button
                  onClick={handleStartEdit}
                  className="text-[#334155] hover:text-[#00f5ff] transition-colors p-1"
                  title="Edit company"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10 2l2 2-7 7H3v-2l7-7z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {/* Delete button */}
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[#334155] hover:text-[#ef4444] transition-colors p-1"
                  title="Delete company"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 4h8M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M10.5 4l-.5 7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3.5 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {/* Close button */}
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
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1.5 bg-[#0d1117] border border-[#1e293b] rounded text-[11px] text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="data-mono text-[9px] text-[#475569] uppercase tracking-wider">Domain</label>
                      <input
                        type="text"
                        value={editDomain}
                        onChange={(e) => setEditDomain(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1.5 bg-[#0d1117] border border-[#1e293b] rounded text-[11px] text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editName.trim() || !editDomain.trim()}
                        className="data-mono text-[10px] text-[#00f5ff] hover:text-white transition-colors font-semibold disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="data-mono text-[10px] text-[#64748b] hover:text-white transition-colors"
                      >
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
                  <span className="data-mono text-[10px] text-[#ef4444]">Delete this company?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="data-mono text-[10px] text-[#ef4444] hover:text-white transition-colors font-semibold"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="data-mono text-[10px] text-[#64748b] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Heat gauge + window */}
            <div className="flex items-center justify-between">
              <HeatGauge score={company.heat_score} />
              <div className="text-right">
                <div className="data-mono text-[10px] text-[#475569] uppercase tracking-wider mb-1">
                  Recruiting Window
                </div>
                <span
                  className="data-mono text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    color: getWindowColor(company.recruiting_window),
                    backgroundColor: `${getWindowColor(company.recruiting_window)}15`,
                    border: `1px solid ${getWindowColor(company.recruiting_window)}40`,
                  }}
                >
                  {getWindowLabel(company.recruiting_window)}
                </span>
              </div>
            </div>
          </div>

          {/* Signals list */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="data-mono text-[10px] text-[#64748b] uppercase tracking-widest mb-3">
              Active Signals ({company.signals.length})
            </h3>

            <div className="space-y-3">
              {[...company.signals]
                .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
                .map((signal, i) => {
                  const badgeColor = getSignalBadgeColor(signal.signal_type);
                  const urgColor = getUrgencyColor(signal.urgency);

                  return (
                    <motion.a
                      key={signal.id}
                      href={signal.source_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e: React.MouseEvent) => { if (!signal.source_url) e.preventDefault(); }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className={`block bg-[#111827]/60 border border-[#1e293b] rounded-lg p-3 hover:border-[#334155] transition-colors ${signal.source_url ? 'cursor-pointer' : 'cursor-default'}`}
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
                          {SIGNAL_TYPE_LABELS[signal.signal_type]}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: urgColor }}
                          />
                          <span className="data-mono text-[9px]" style={{ color: urgColor }}>
                            {getUrgencyLabel(signal.urgency)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#e2e8f0] leading-relaxed mb-1.5">
                        {signal.headline}
                      </p>
                      {signal.why_it_matters && (
                        <p className="text-[10px] text-[#64748b] leading-relaxed italic">
                          {signal.why_it_matters}
                        </p>
                      )}
                      <div className="data-mono text-[9px] text-[#334155] mt-1.5">
                        {new Date(signal.detected_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </motion.a>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
