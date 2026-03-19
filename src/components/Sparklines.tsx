'use client';

interface SparklinesProps {
  data: number[];
  color: string;
}

export function Sparklines({ data, color }: SparklinesProps) {
  const max = Math.max(...data, 1);
  const w = 64;
  const h = 16;
  const padding = 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - (v / max) * (h - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

export function SparklinesLine() {
  return null;
}
