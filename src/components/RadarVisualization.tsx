'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { CompanyWithSignals } from '@/types';

interface Props {
  companies: CompanyWithSignals[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TIER_RADIUS: Record<string, number> = {
  tier_1: 0.3,
  tier_2: 0.55,
  tier_3: 0.78,
};

function getHeatColor(score: number): { fill: string; glow: string; anim: string } {
  if (score >= 70) return { fill: '#ef4444', glow: 'rgba(239,68,68,0.6)', anim: 'animate-pulse-hot' };
  if (score >= 40) return { fill: '#f59e0b', glow: 'rgba(245,158,11,0.5)', anim: 'animate-pulse-warm' };
  return { fill: '#00f5ff', glow: 'rgba(0,245,255,0.4)', anim: '' };
}

export default function RadarVisualization({ companies, selectedId, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;

  const rings = [
    { r: maxR * 0.3, label: 'Tier 1' },
    { r: maxR * 0.55, label: 'Tier 2' },
    { r: maxR * 0.78, label: 'Tier 3' },
  ];

  const companyPositions = useMemo(() => {
    return companies.map((c) => {
      const radiusFraction = TIER_RADIUS[c.tier] || 0.5;
      const r = maxR * radiusFraction;
      const angleRad = ((c.radar_angle - 90) * Math.PI) / 180;
      const x = cx + r * Math.cos(angleRad);
      const y = cy + r * Math.sin(angleRad);
      const heat = getHeatColor(c.heat_score);
      return { ...c, x, y, heat };
    });
  }, [companies, cx, cy, maxR]);

  const hoveredCompany = companyPositions.find((c) => c.id === hoveredId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative flex items-center justify-center"
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[500px] aspect-square"
      >
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a0a0a" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,245,255,0)" />
            <stop offset="70%" stopColor="rgba(0,245,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,245,255,0.25)" />
          </linearGradient>
        </defs>

        {/* Background */}
        <circle cx={cx} cy={cy} r={maxR} fill="url(#radarBg)" stroke="#1a1a2e" strokeWidth="1" />

        {/* Grid rings */}
        {rings.map((ring, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={ring.r}
            fill="none"
            stroke="#1e293b"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            opacity={0.6}
          />
        ))}

        {/* Cross hairs */}
        <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#1e293b" strokeWidth="0.5" opacity={0.4} />
        <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#1e293b" strokeWidth="0.5" opacity={0.4} />
        <line
          x1={cx - maxR * 0.707}
          y1={cy - maxR * 0.707}
          x2={cx + maxR * 0.707}
          y2={cy + maxR * 0.707}
          stroke="#1e293b"
          strokeWidth="0.3"
          opacity={0.3}
        />
        <line
          x1={cx + maxR * 0.707}
          y1={cy - maxR * 0.707}
          x2={cx - maxR * 0.707}
          y2={cy + maxR * 0.707}
          stroke="#1e293b"
          strokeWidth="0.3"
          opacity={0.3}
        />

        {/* Radar sweep arm */}
        <g className="animate-radar-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path
            d={`M ${cx} ${cy} L ${cx} ${cy - maxR} A ${maxR} ${maxR} 0 0 1 ${cx + maxR * Math.sin(Math.PI / 6)} ${cy - maxR * Math.cos(Math.PI / 6)} Z`}
            fill="url(#sweepGrad)"
            opacity={0.6}
          />
          <line x1={cx} y1={cy} x2={cx} y2={cy - maxR} stroke="#00f5ff" strokeWidth="1" opacity={0.5} />
        </g>

        {/* Company dots */}
        {companyPositions.map((c) => (
          <g
            key={c.id}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelect(c.id)}
            style={{ cursor: 'pointer' }}
          >
            {/* Glow circle */}
            <circle
              cx={c.x}
              cy={c.y}
              r={selectedId === c.id ? 14 : 10}
              fill={c.heat.fill}
              opacity={0.15}
              filter="url(#glow)"
              className={c.heat.anim}
            />
            {/* Main dot */}
            <circle
              cx={c.x}
              cy={c.y}
              r={selectedId === c.id ? 7 : 5}
              fill={c.heat.fill}
              stroke={selectedId === c.id ? '#fff' : 'none'}
              strokeWidth={selectedId === c.id ? 1.5 : 0}
              filter="url(#glow)"
              className={c.heat.anim}
            />
            {/* Label */}
            <text
              x={c.x}
              y={c.y + 16}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="8"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {c.company_name.length > 12 ? c.company_name.slice(0, 11) + '…' : c.company_name}
            </text>
          </g>
        ))}

        {/* Center point */}
        <circle cx={cx} cy={cy} r={8} fill="#0a0a0a" stroke="#00f5ff" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={3} fill="#00f5ff" opacity={0.8} />
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fill="#00f5ff"
          fontSize="9"
          fontWeight="bold"
          fontFamily="var(--font-geist-mono), monospace"
        >
          COGNITION
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredCompany && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 bg-[#111827]/95 border border-[#1e293b] rounded-lg px-4 py-3 pointer-events-none backdrop-blur-sm"
          style={{
            top: '10px',
            right: '10px',
          }}
        >
          <div className="data-mono text-sm font-semibold text-white">{hoveredCompany.company_name}</div>
          <div className="flex gap-3 mt-1.5">
            <span className="data-mono text-xs text-[#64748b]">
              {hoveredCompany.tier.replace('_', ' ').toUpperCase()}
            </span>
            <span className="data-mono text-xs" style={{ color: hoveredCompany.heat.fill }}>
              {hoveredCompany.signals.length} signals
            </span>
          </div>
          {hoveredCompany.signals.length > 0 && (
            <div className="data-mono text-xs text-[#94a3b8] mt-1">
              Top: {hoveredCompany.signals[0]?.signal_type.replace('_', ' ')}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
