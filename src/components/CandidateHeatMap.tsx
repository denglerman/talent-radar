'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { CandidateWithSignals, CandidateSignal, CANDIDATE_SIGNAL_TYPES, CANDIDATE_SIGNAL_TYPE_LABELS, CandidateSignalType } from '@/types';

interface Props {
  candidates: CandidateWithSignals[];
  onSelectCandidate: (id: string) => void;
}

function getIntensity(signals: CandidateSignal[], type: CandidateSignalType): { level: number; signal: CandidateSignal | null } {
  const matching = signals.filter((s) => s.signal_type === type);
  if (matching.length === 0) return { level: 0, signal: null };

  const best = matching.sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime())[0];
  const daysAgo = (Date.now() - new Date(best.published_at || '').getTime()) / (1000 * 60 * 60 * 24);

  let base = best.urgency >= 7 ? 3 : best.urgency >= 4 ? 2 : 1;
  if (daysAgo < 7) base += 1;
  return { level: Math.min(base, 4), signal: best };
}

function getCellColor(level: number): string {
  if (level === 0) return 'bg-[#0d1117]';
  if (level === 1) return 'bg-[#00f5ff]/10';
  if (level === 2) return 'bg-[#00f5ff]/25';
  if (level === 3) return 'bg-[#8b5cf6]/40';
  return 'bg-[#8b5cf6]/70';
}

function getCellBorder(level: number): string {
  if (level === 0) return 'border-[#1a1a2e]';
  if (level <= 2) return 'border-[#00f5ff]/20';
  return 'border-[#8b5cf6]/30';
}

export default function CandidateHeatMap({ candidates, onSelectCandidate }: Props) {
  const [hovered, setHovered] = useState<{ candidateId: string; type: CandidateSignalType } | null>(null);

  const sorted = [...candidates].sort((a, b) => b.mobility_score - a.mobility_score);

  const hoveredData = hovered
    ? (() => {
        const c = sorted.find((co) => co.id === hovered.candidateId);
        if (!c) return null;
        const { signal } = getIntensity(c.signals, hovered.type);
        return { candidate: c, signal, type: hovered.type };
      })()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="relative"
    >
      <h3 className="data-mono text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-3">
        Signal Heat Map
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left data-mono text-[10px] text-[#475569] pb-2 pr-2 w-24">Candidate</th>
              {CANDIDATE_SIGNAL_TYPES.map((type) => (
                <th key={type} className="data-mono text-[10px] text-[#475569] pb-2 px-1 text-center">
                  {CANDIDATE_SIGNAL_TYPE_LABELS[type]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((candidate, i) => (
              <motion.tr
                key={candidate.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.04 }}
                className="cursor-pointer hover:bg-white/[0.02]"
                onClick={() => onSelectCandidate(candidate.id)}
              >
                <td className="data-mono text-[11px] text-[#94a3b8] py-1 pr-2 truncate max-w-[100px]">
                  {candidate.name}
                </td>
                {CANDIDATE_SIGNAL_TYPES.map((type) => {
                  const { level } = getIntensity(candidate.signals, type);
                  return (
                    <td key={type} className="p-0.5">
                      <div
                        className={`w-full h-6 rounded-sm border ${getCellColor(level)} ${getCellBorder(level)} transition-all duration-300 ${level >= 3 ? 'animate-breathe' : ''}`}
                        onMouseEnter={() => setHovered({ candidateId: candidate.id, type })}
                        onMouseLeave={() => setHovered(null)}
                      />
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {hoveredData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute z-50 bg-[#111827]/95 border border-[#1e293b] rounded-lg px-3 py-2 pointer-events-none backdrop-blur-sm top-0 right-0"
        >
          <div className="data-mono text-xs font-semibold text-white">
            {hoveredData.candidate.name}
          </div>
          <div className="data-mono text-[10px] text-[#00f5ff] mt-0.5">
            {CANDIDATE_SIGNAL_TYPE_LABELS[hoveredData.type]}
          </div>
          {hoveredData.signal ? (
            <>
              <div className="data-mono text-[10px] text-[#94a3b8] mt-1 max-w-[200px] line-clamp-2">
                {hoveredData.signal.headline}
              </div>
              <div className="data-mono text-[10px] text-[#475569] mt-0.5">
                {hoveredData.signal.published_at ? new Date(hoveredData.signal.published_at).toLocaleDateString() : 'Unknown'}
              </div>
            </>
          ) : (
            <div className="data-mono text-[10px] text-[#475569] mt-1">No signals detected</div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
