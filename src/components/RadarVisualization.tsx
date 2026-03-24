'use client';

import { motion } from 'framer-motion';
import { useState, useMemo, useEffect, useRef } from 'react';
import { CompanyWithSignals } from '@/types';

interface Props {
  companies: CompanyWithSignals[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function getHeatColor(score: number): { fill: string; glow: string; pulse: 'hot' | 'warm' | 'none' } {
  if (score >= 70) return { fill: '#ef4444', glow: 'rgba(239,68,68,0.6)', pulse: 'hot' };
  if (score >= 40) return { fill: '#f59e0b', glow: 'rgba(245,158,11,0.5)', pulse: 'warm' };
  return { fill: '#00f5ff', glow: 'rgba(0,245,255,0.4)', pulse: 'none' };
}

export default function RadarVisualization({ companies, selectedId, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const width = 900;
  const height = 480;
  const cx = width / 2;
  const cy = height - 30;
  const maxR = height - 60;
  const minR = maxR * 0.15;

  // Decorative guide rings
  const rings = [
    { r: maxR * 0.25 },
    { r: maxR * 0.5 },
    { r: maxR * 0.75 },
  ];

  const companyPositions = useMemo(() => {
    return companies.map((c) => {
      // Heat score determines distance: highest score = closest to center
      // score 100 -> minR (closest), score 0 -> maxR (furthest)
      const r = minR + (1 - c.heat_score / 100) * (maxR - minR);
      // Map radar_angle (0-360) to semicircle (PI to 0, left to right across the top)
      const mappedAngle = Math.PI - (c.radar_angle / 360) * Math.PI;
      const x = cx + r * Math.cos(mappedAngle);
      const y = cy - r * Math.sin(mappedAngle);
      const heat = getHeatColor(c.heat_score);
      return { ...c, x, y, heat };
    });
  }, [companies, cx, cy, maxR, minR]);

  const hoveredCompany = companyPositions.find((c) => c.id === hoveredId);

  const sweepArmLength = maxR;

  // Animated sweep arm: back and forth across 180 degrees
  const [sweepAngle, setSweepAngle] = useState(0); // 0 = right edge, PI = left edge
  const dirRef = useRef(1); // 1 = moving left (0->PI), -1 = moving right (PI->0)
  const angleRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    let lastTime: number | null = null;
    const speed = Math.PI / 6; // full sweep in 6 seconds

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
          <radialGradient id="radarBg" cx="50%" cy="100%" r="100%">
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
          <linearGradient id="sweepGrad" gradientTransform="rotate(15)">
            <stop offset="0%" stopColor="rgba(0,245,255,0)" />
            <stop offset="60%" stopColor="rgba(0,245,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,245,255,0.2)" />
          </linearGradient>
          <clipPath id="semiClip">
            <rect x="0" y="0" width={width} height={cy + 1} />
          </clipPath>
        </defs>

        <g clipPath="url(#semiClip)">
          {/* Background semicircle */}
          <path
            d={`M ${cx - maxR} ${cy} A ${maxR} ${maxR} 0 0 1 ${cx + maxR} ${cy} L ${cx - maxR} ${cy} Z`}
            fill="url(#radarBg)"
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

          {/* Radar sweep arm -- animated back and forth with trailing wedge */}
          {(() => {
            const armX = cx + sweepArmLength * Math.cos(sweepAngle);
            const armY = cy - sweepArmLength * Math.sin(sweepAngle);
            // Trailing wedge: ~18deg behind the direction of movement
            const wedgeSpan = Math.PI / 10;
            const trailAngle = dirRef.current === 1
              ? sweepAngle - wedgeSpan  // moving left, trail is to the right (lower angle)
              : sweepAngle + wedgeSpan; // moving right, trail is to the left (higher angle)
            const clampedTrail = Math.max(0, Math.min(Math.PI, trailAngle));
            const trailX = cx + sweepArmLength * Math.cos(clampedTrail);
            const trailY = cy - sweepArmLength * Math.sin(clampedTrail);
            // Determine arc sweep flag based on direction
            const sweepFlag = dirRef.current === 1 ? 1 : 0;
            return (
              <g>
                {/* Sweep wedge (trailing glow behind direction of movement) */}
                <path
                  d={`M ${cx} ${cy} L ${armX} ${armY} A ${sweepArmLength} ${sweepArmLength} 0 0 ${sweepFlag} ${trailX} ${trailY} Z`}
                  fill="url(#sweepGrad)"
                  opacity={0.5}
                />
                {/* Sweep line */}
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

          {/* Company dots */}
          {companyPositions.map((c) => {
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
                    filter="url(#glow)"
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
                    filter="url(#glow)"
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
                    filter="url(#glow)"
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
                    filter="url(#glow)"
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
                  {c.company_name.length > 14 ? c.company_name.slice(0, 13) + '…' : c.company_name}
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

        {/* TALENT RADAR label -- outside clipPath so it's visible below the baseline */}
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill="#00f5ff"
          fontSize="10"
          fontWeight="bold"
          fontFamily="var(--font-geist-mono), monospace"
        >
          TALENT RADAR
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
