'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CandidateWithSignals, CandidateTier, TIER_LABELS } from '@/types';

interface Props {
  candidates: CandidateWithSignals[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  onAddCandidate: (data: {
    name: string;
    current_company: string;
    current_role: string;
    linkedin_url: string;
    twitter_handle: string;
    github_username: string;
    tier: string;
  }) => Promise<boolean>;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
}

function getTierColor(tier: CandidateTier): string {
  if (tier === 'tier_1') return '#00f5ff';
  if (tier === 'tier_2') return '#8b5cf6';
  return '#64748b';
}

function getMobilityColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#00f5ff';
}

export default function CandidateWatchlist({ candidates, selectedId, onSelect, collapsed, onToggle, onAddCandidate, onDeleteCandidate }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const sorted = [...candidates].sort((a, b) => b.mobility_score - a.mobility_score);

  const handleDelete = async (candidateId: string) => {
    setConfirmDeleteId(null);
    await onDeleteCandidate(candidateId);
  };

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
              Candidates
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

        {/* Candidate list */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto">
            {sorted.map((candidate, i) => {
              const isSelected = selectedId === candidate.id;
              const isHovered = hoveredCandidateId === candidate.id;
              const mobilityColor = getMobilityColor(candidate.mobility_score);

              return (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  onClick={() => onSelect(candidate.id)}
                  onMouseEnter={() => setHoveredCandidateId(candidate.id)}
                  onMouseLeave={() => { setHoveredCandidateId(null); setConfirmDeleteId(null); }}
                  className={`relative px-3 py-2.5 cursor-pointer border-b border-[#1e293b]/50 transition-all hover:bg-white/[0.03] ${
                    isSelected ? 'bg-white/[0.05] border-l-2 border-l-[#00f5ff]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {/* Candidate avatar monogram */}
                      <div
                        className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: mobilityColor,
                          fontSize: 9,
                          lineHeight: 1,
                        }}
                      >
                        {candidate.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[12px] text-[#e2e8f0] font-medium truncate block max-w-[120px]">
                          {candidate.name}
                        </span>
                        {candidate.current_company && (
                          <span className="text-[10px] text-[#475569] truncate block max-w-[120px]">
                            {candidate.current_company}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isHovered && confirmDeleteId !== candidate.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(candidate.id); }}
                          className="text-[#334155] hover:text-[#ef4444] transition-colors p-0.5"
                          title="Delete candidate"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 3.5h7M4.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M9 3.5l-.4 5.6a1 1 0 0 1-1 .9H4.4a1 1 0 0 1-1-.9L3 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                      <span
                        className="data-mono text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          color: getTierColor(candidate.tier),
                          backgroundColor: `${getTierColor(candidate.tier)}15`,
                          border: `1px solid ${getTierColor(candidate.tier)}30`,
                        }}
                      >
                        {TIER_LABELS[candidate.tier]}
                      </span>
                    </div>
                  </div>

                  {confirmDeleteId === candidate.id && (
                    <div className="flex items-center justify-between mt-1 mb-1 py-1 px-2 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded" onClick={(e) => e.stopPropagation()}>
                      <span className="data-mono text-[9px] text-[#ef4444]">Delete?</span>
                      <div className="flex gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(candidate.id); }} className="data-mono text-[9px] text-[#ef4444] hover:text-white transition-colors">Yes</button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="data-mono text-[9px] text-[#64748b] hover:text-white transition-colors">No</button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: mobilityColor }}
                      />
                      <span
                        className="data-mono text-[11px] font-bold"
                        style={{ color: mobilityColor }}
                      >
                        {candidate.mobility_score}
                      </span>
                      <span className="data-mono text-[9px] text-[#475569]">mobility</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Candidate button */}
        {!collapsed && (
          <div className="p-3 border-t border-[#1e293b]">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full data-mono text-[11px] text-[#475569] hover:text-[#00f5ff] border border-[#1e293b] hover:border-[#00f5ff]/30 rounded-lg py-2 transition-all"
            >
              + Add Candidate
            </button>
          </div>
        )}
      </motion.div>

      {/* Add Candidate Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCandidateModal
            onClose={() => setShowAddModal(false)}
            onAdd={onAddCandidate}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AddCandidateModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    current_company: string;
    current_role: string;
    linkedin_url: string;
    twitter_handle: string;
    github_username: string;
    tier: string;
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [tier, setTier] = useState<CandidateTier>('tier_2');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const success = await onAdd({
      name: name.trim(),
      current_company: currentCompany.trim(),
      current_role: currentRole.trim(),
      linkedin_url: linkedinUrl.trim(),
      twitter_handle: twitterHandle.trim().replace(/^@/, ''),
      github_username: githubUsername.trim(),
      tier,
    });
    setSubmitting(false);
    if (success) onClose();
  };

  const inputClass = "w-full bg-[#0d1117] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:border-[#00f5ff]/50 focus:outline-none transition-colors";

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
        className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 w-96 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="data-mono text-sm font-semibold text-white mb-4">Add Candidate</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Full Name *
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Sarah Chen" required />
          </div>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Current Company
            </label>
            <input type="text" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} className={inputClass} placeholder="e.g. Google DeepMind" />
          </div>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Current Role
            </label>
            <input type="text" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className={inputClass} placeholder="e.g. Staff Engineer" />
          </div>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              LinkedIn URL
            </label>
            <input type="text" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Twitter Handle
            </label>
            <input type="text" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value)} className={inputClass} placeholder="@handle" />
            <span className="data-mono text-[9px] text-[#334155] mt-1 block">Used for sentiment analysis via Twitter API</span>
          </div>
          <div className="mb-3">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              GitHub Username
            </label>
            <input type="text" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} className={inputClass} placeholder="e.g. sarachen-dev" />
            <span className="data-mono text-[9px] text-[#334155] mt-1 block">Used for activity tracking via GitHub API</span>
          </div>
          <div className="mb-4">
            <label className="data-mono text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as CandidateTier)}
              className={inputClass}
            >
              <option value="tier_1">Tier 1 — Must Recruit</option>
              <option value="tier_2">Tier 2 — High Priority</option>
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
              disabled={submitting || !name.trim()}
              className="flex-1 data-mono text-[11px] text-[#0a0a0a] bg-[#00f5ff] rounded-lg py-2 font-semibold hover:bg-[#00f5ff]/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
