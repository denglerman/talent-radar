'use client';

import { motion } from 'framer-motion';
import { useState, useMemo, useEffect, useRef } from 'react';
import { CandidateWithSignals } from '@/types';

interface Props {
  candidates: CandidateWithSignals[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function getMobilityColor(score: number): { fill: string; glow: string; pulse: 'hot' | 'warm' | 'none' } {
  if (score >= 70) return { fill: '#ef4444', glow: 'rgba(239,68,68,0.6)', pulse: 'hot' };
  if (score >= 40) return { fill: '#f59e0b', glow: 'rgba(245,158,11,0.5)', pulse: 'warm' };
  return { fill: '#00f5ff', glow: 'rgba(0,245,255,0.4)', pulse: 'none' };
}

export default function CandidateRadar({ candidates, selectedId, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const width = 900;
  const height = 480;
  const cx = width / 2;
  const cy = height - 30;
  const maxR = height - 60;

  // Decorative guide rings (one per tier zone)
  const rings = [
    { r: maxR * 0.25 },
    { r: maxR * 0.5 },
    { r: maxR * 0.75 },
  ];

  const candidatePositions = useMemo(() => {
    // Tier determines distance: tier_1 closest, tier_3 furthest
    const tierRadius = {
      tier_1: maxR * 0.3,
      tier_2: maxR * 0.55,
      tier_3: maxR * 0.8,
    };

    // Group by tier and distribute evenly within each tier's arc
    const byTier: Record<string, CandidateWithSignals[]> = { tier_1: [], tier_2: [], tier_3: [] };
    candidates.forEach((c) => {
      if (byTier[c.tier]) byTier[c.tier].push(c);
    });

    const positions: (CandidateWithSignals & { x: number; y: number; heat: ReturnType<typeof getMobilityColor> })[] = [];

    for (const [tier, members] of Object.entries(byTier)) {
      const r = tierRadius[tier as keyof typeof tierRadius];
      const count = members.length;
      if (count === 0) continue;

      // Spread evenly across the semicircle (with padding from edges)
      const padding = Math.PI * 0.1;
      const arcSpan = Math.PI - 2 * padding;

      members.forEach((c, i) => {
        const angle = padding + (count === 1 ? arcSpan / 2 : (i / (count - 1)) * arcSpan);
        const x = cx + r * Math.cos(angle);
        const y = cy - r * Math.sin(angle);
        const heat = getMobilityColor(c.mobility_score);
        positions.push({ ...c, x, y, heat });
      });
    }

    return positions;
  }, [candidates, cx, cy, maxR]);

  const hoveredCandidate = candidatePositions.find((c) => c.id === hoveredId);

  const sweepArmLength = maxR;

  // Animated sweep arm: back and forth across 180 degrees
  const [sweepAngle, setSweepAngle] = useState(0);
  const dirRef = useRef(1);
  const angleRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    let lastTime: number | null = null;
    const speed = Math.PI / 6;

    const tick = (time: number) => {
      if (lastTime === null) { lastTime = time; }
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      angleRef.current += dirRef.current * speed * dt;

      if (angleRef.current >= Math.PI) {
        angleRef.current = Math.PI;
        dirRef.current = -1;
      } else if (angleRef.current <= 0) {
        angleRef.current = 0;
        dirRef.current = 1;
      }

      setSweepAngle(angleRef.current);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative flex items-center justify-center w-full"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: '55vh' }}
      >
        <defs>
          <radialGradient id="candidateRadarBg" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#0a0a0a" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>
          <filter id="candidateGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="candidateSweepGrad" gradientTransform="rotate(15)">
            <stop offset="0%" stopColor="rgba(0,245,255,0)" />
            <stop offset="60%" stopColor="rgba(0,245,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,245,255,0.2)" />
          </linearGradient>
          <clipPath id="candidateSemiClip">
            <rect x="0" y="0" width={width} height={cy + 1} />
          </clipPath>
        </defs>

        <g clipPath="url(#candidateSemiClip)">
          {/* Background semicircle */}
          <path
            d={`M ${cx - maxR} ${cy} A ${maxR} ${maxR} 0 0 1 ${cx + maxR} ${cy} L ${cx - maxR} ${cy} Z`}
            fill="url(#candidateRadarBg)"
            stroke="#1a1a2e"
            strokeWidth="1"
          />

          {/* Grid arcs */}
          {rings.map((ring, i) => (
            <path
              key={i}
              d={`M ${cx - ring.r} ${cy} A ${ring.r} ${ring.r} 0 0 1 ${cx + ring.r} ${cy}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity={0.6}
            />
          ))}

          {/* Tier labels on arcs */}
          <text x={cx + maxR * 0.3 + 15} y={cy - 5} fill="#334155" fontSize="8" fontFamily="var(--font-geist-mono), monospace">T1</text>
          <text x={cx + maxR * 0.55 + 15} y={cy - 5} fill="#334155" fontSize="8" fontFamily="var(--font-geist-mono), monospace">T2</text>
          <text x={cx + maxR * 0.8 + 15} y={cy - 5} fill="#334155" fontSize="8" fontFamily="var(--font-geist-mono), monospace">T3</text>

          {/* Radial lines */}
          {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x2 = cx + maxR * Math.cos(rad);
            const y2 = cy - maxR * Math.sin(rad);
            return (
              <line
                key={deg}
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="#1e293b"
                strokeWidth={deg === 0 || deg === 90 || deg === 180 ? 0.5 : 0.3}
                opacity={deg === 0 || deg === 90 || deg === 180 ? 0.4 : 0.25}
              />
            );
          })}

          {/* Radar sweep arm */}
          {(() => {
            const armX = cx + sweepArmLength * Math.cos(sweepAngle);
            const armY = cy - sweepArmLength * Math.sin(sweepAngle);
            const wedgeSpan = Math.PI / 10;
            const trailAngle = dirRef.current === 1
              ? sweepAngle - wedgeSpan
              : sweepAngle + wedgeSpan;
            const clampedTrail = Math.max(0, Math.min(Math.PI, trailAngle));
            const trailX = cx + sweepArmLength * Math.cos(clampedTrail);
            const trailY = cy - sweepArmLength * Math.sin(clampedTrail);
            const sweepFlag = dirRef.current === 1 ? 1 : 0;
            return (
              <g>
                <path
                  d={`M ${cx} ${cy} L ${armX} ${armY} A ${sweepArmLength} ${sweepArmLength} 0 0 ${sweepFlag} ${trailX} ${trailY} Z`}
                  fill="url(#candidateSweepGrad)"
                  opacity={0.5}
                />
                <line
                  x1={cx}
                  y1={cy}
                  x2={armX}
                  y2={armY}
                  stroke="#00f5ff"
                  strokeWidth="1.5"
                  opacity={0.6}
                />
              </g>
            );
          })()}

          {/* Candidate dots */}
          {candidatePositions.map((c) => {
            const isSelected = selectedId === c.id;
            const baseR = isSelected ? 7 : 5;
            const glowBaseR = isSelected ? 14 : 10;

            return (
              <g
                key={c.id}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(c.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow circle */}
                {c.heat.pulse !== 'none' ? (
                  <motion.circle
                    cx={c.x}
                    cy={c.y}
                    fill={c.heat.fill}
                    filter="url(#candidateGlow)"
                    animate={{
                      opacity: c.heat.pulse === 'hot' ? [0.15, 0.3, 0.15] : [0.15, 0.22, 0.15],
                      r: c.heat.pulse === 'hot' ? [glowBaseR, glowBaseR + 6, glowBaseR] : [glowBaseR, glowBaseR + 4, glowBaseR],
                    }}
                    transition={{
                      duration: c.heat.pulse === 'hot' ? 1.5 : 2.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ) : (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={glowBaseR}
                    fill={c.heat.fill}
                    opacity={0.15}
                    filter="url(#candidateGlow)"
                  />
                )}
                {/* Main dot */}
                {c.heat.pulse !== 'none' ? (
                  <motion.circle
                    cx={c.x}
                    cy={c.y}
                    fill={c.heat.fill}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    filter="url(#candidateGlow)"
                    animate={{
                      opacity: c.heat.pulse === 'hot' ? [1, 0.7, 1] : [1, 0.85, 1],
                      r: c.heat.pulse === 'hot' ? [baseR, baseR + 2, baseR] : [baseR, baseR + 1.2, baseR],
                    }}
                    transition={{
                      duration: c.heat.pulse === 'hot' ? 1.5 : 2.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ) : (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={baseR}
                    fill={c.heat.fill}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    filter="url(#candidateGlow)"
                  />
                )}
                {/* Label */}
                <text
                  x={c.x}
                  y={c.y - (isSelected ? 12 : 10)}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="var(--font-geist-mono), monospace"
                >
                  {c.name.length > 14 ? c.name.slice(0, 13) + '\u2026' : c.name}
                </text>
              </g>
            );
          })}

          {/* Center point */}
          <circle cx={cx} cy={cy} r={8} fill="#0a0a0a" stroke="#00f5ff" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={3} fill="#00f5ff" opacity={0.8} />
        </g>

        {/* Bottom edge line */}
        <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#1a1a2e" strokeWidth="1" />

        {/* COGNITION label */}
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill="#00f5ff"
          fontSize="10"
          fontWeight="bold"
          fontFamily="var(--font-geist-mono), monospace"
        >
          COGNITION
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredCandidate && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 bg-[#111827]/95 border border-[#1e293b] rounded-lg px-4 py-3 pointer-events-none backdrop-blur-sm"
          style={{
            top: '10px',
            right: '10px',
          }}
        >
          <div className="data-mono text-sm font-semibold text-white">{hoveredCandidate.name}</div>
          {hoveredCandidate.current_role || hoveredCandidate.current_company ? (
            <div className="data-mono text-[11px] text-[#64748b] mt-0.5">
              {hoveredCandidate.current_role}{hoveredCandidate.current_company ? ` @ ${hoveredCandidate.current_company}` : ''}
            </div>
          ) : null}
          <div className="flex gap-3 mt-1.5">
            <span className="data-mono text-xs" style={{ color: hoveredCandidate.heat.fill }}>
              Mobility: {hoveredCandidate.mobility_score}
            </span>
            <span className="data-mono text-xs text-[#64748b]">
              {hoveredCandidate.signals.length} signals
            </span>
          </div>
          {hoveredCandidate.signals.length > 0 && (
            <div className="data-mono text-xs text-[#94a3b8] mt-1">
              Top: {hoveredCandidate.signals[0]?.headline?.slice(0, 40)}...
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
