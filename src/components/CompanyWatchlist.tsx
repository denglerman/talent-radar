'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CompanyWithSignals, CompanyTier, TIER_LABELS } from '@/types';
import { Sparklines, SparklinesLine } from './Sparklines';

interface Props {
  companies: CompanyWithSignals[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

function getTierColor(tier: CompanyTier): string {
  if (tier === 'tier_1') return '#00f5ff';
  if (tier === 'tier_2') return '#8b5cf6';
  return '#64748b';
}

function getHeatColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#00f5ff';
}

function getSparklineData(signals: { detected_at: string }[]): number[] {
  const now = Date.now();
  const buckets = Array(30).fill(0);
  signals.forEach((s) => {
    const daysAgo = Math.floor((now - new Date(s.detected_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo >= 0 && daysAgo < 30) {
      buckets[29 - daysAgo] += 1;
    }
  });
  return buckets;
}

export default function CompanyWatchlist({ companies, selectedId, onSelect, collapsed, onToggle }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const sorted = [...companies].sort((a, b) => b.heat_score - a.heat_score);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className={`flex flex-col h-full bg-[#0d1117]/60 border-r border-[#1e293b] transition-all duration-300 ${
          collapsed ? 'w-12' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#1e293b]">
          {!collapsed && (
            <h2 className="data-mono text-xs font-semibold text-[#64748b] uppercase tracking-widest">
              Watchlist
            </h2>
          )}
          <button
            onClick={onToggle}
            className="text-[#475569] hover:text-[#00f5ff] transition-colors p-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {collapsed ? (
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Company list */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto">
            {sorted.map((company, i) => {
              const sparkData = getSparklineData(company.signals);
              const isSelected = selectedId === company.id;

              return (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  onClick={() => onSelect(company.id)}
                  className={`px-3 py-2.5 cursor-pointer border-b border-[#1e293b]/50 transition-all hover:bg-white/[0.03] ${
                    isSelected ? 'bg-white/[0.05] border-l-2 border-l-[#00f5ff]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://logo.clearbit.com/${company.domain}`}
                        alt=""
                        className="w-4 h-4 rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[12px] text-[#e2e8f0] font-medium truncate max-w-[100px]">
                        {company.company_name}
                      </span>
                    </div>
                    <span
                      className="data-mono text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{
                        color: getTierColor(company.tier),
                        backgroundColor: `${getTierColor(company.tier)}15`,
                        border: `1px solid ${getTierColor(company.tier)}30`,
                      }}
                    >
                      {TIER_LABELS[company.tier]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getHeatColor(company.heat_score) }}
                      />
                      <span
                        className="data-mono text-[11px] font-bold"
                        style={{ color: getHeatColor(company.heat_score) }}
                      >
                        {company.heat_score}
                      </span>
                    </div>
                    <div className="w-16 h-4">
                      <Sparklines data={sparkData} color={getHeatColor(company.heat_score)} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Company button */}
        {!collapsed && (
          <div className="p-3 border-t border-[#1e293b]">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full data-mono text-[11px] text-[#475569] hover:text-[#00f5ff] border border-[#1e293b] hover:border-[#00f5ff]/30 rounded-lg py-2 transition-all"
            >
              + Add Company
            </button>
          </div>
        )}
      </motion.div>

      {/* Add Company Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCompanyModal onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function AddCompanyModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<CompanyTier>('tier_2');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a full implementation, this would call addCompany and refresh
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="data-mono text-sm font-semibold text-white mb-4">Add Target Company</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors"
              placeholder="e.g. Vercel"
            />
          </div>
          <div className="mb-4">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as CompanyTier)}
              className="w-full bg-[#0d1117] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors"
            >
              <option value="tier_1">Tier 1 — Critical</option>
              <option value="tier_2">Tier 2 — Important</option>
              <option value="tier_3">Tier 3 — Monitor</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 data-mono text-[11px] text-[#64748b] border border-[#1e293b] rounded-lg py-2 hover:bg-white/[0.03] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 data-mono text-[11px] text-[#0a0a0a] bg-[#00f5ff] rounded-lg py-2 font-semibold hover:bg-[#00f5ff]/90 transition-colors"
            >
              Add Target
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
