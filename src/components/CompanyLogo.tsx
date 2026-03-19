'use client';

import { useState } from 'react';

interface Props {
  domain: string;
  companyName: string;
  size?: number;
  heatColor?: string;
}

export default function CompanyLogo({ domain, companyName, size = 16, heatColor = '#475569' }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-sm font-bold text-white shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: heatColor,
          fontSize: size * 0.5,
          lineHeight: 1,
        }}
      >
        {companyName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={companyName}
      className="rounded-sm shrink-0"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
