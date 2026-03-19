'use client';

import { motion } from 'framer-motion';
import { Signal, Company, SIGNAL_TYPE_LABELS, SignalType, UrgencyLevel } from '@/types';
import CompanyLogo from './CompanyLogo';

interface Props {
  signals: Signal[];
  companies: Company[];
}

function getUrgencyColor(urgency: UrgencyLevel): string {
  if (urgency === 'high') return '#ef4444';
  if (urgency === 'medium') return '#f59e0b';
  return '#00f5ff';
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

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function SignalTimeline({ signals, companies }: Props) {
  const sorted = [...signals].sort(
    (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  );

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="h-full"
    >
      <h3 className="data-mono text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-3">
        Signal Timeline
      </h3>

      <div className="relative overflow-y-auto max-h-[380px] pr-2">
        {/* Center line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#1e293b]" />

        {sorted.map((signal, i) => {
          const company = companyMap.get(signal.company_id);
          const urgColor = getUrgencyColor(signal.urgency);
          const badgeColor = getSignalBadgeColor(signal.signal_type);

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

              <a
                href={signal.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`block bg-[#0d1117]/80 border border-[#1e293b] rounded-lg p-3 hover:border-[#334155] transition-colors ${signal.source_url ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={(e) => { if (!signal.source_url) e.preventDefault(); }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {company && (
                      <CompanyLogo
                        domain={company.domain}
                        companyName={company.company_name}
                        size={16}
                        heatColor={getUrgencyColor(signal.urgency)}
                      />
                    )}
                    <span className="data-mono text-[11px] text-[#e2e8f0] font-medium">
                      {company?.company_name || 'Unknown'}
                    </span>
                  </div>
                  <span className="data-mono text-[10px] text-[#475569]">
                    {timeAgo(signal.detected_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
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
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: urgColor }}
                  />
                </div>

                <p className="text-[11px] text-[#94a3b8] leading-relaxed line-clamp-2">
                  {signal.headline}
                </p>
              </a>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
