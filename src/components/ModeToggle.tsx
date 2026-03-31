'use client';

import { useState, ReactNode } from 'react';

interface Props {
  companyDashboard: ReactNode;
  candidateDashboard: ReactNode;
}

type Mode = 'companies' | 'candidates';

export default function ModeToggle({ companyDashboard, candidateDashboard }: Props) {
  const [mode, setMode] = useState<Mode>('companies');

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Pill toggle — fixed top-center, above everything */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60]">
        <div className="flex bg-[#0d1117]/90 border border-[#1e293b] rounded-full p-0.5 backdrop-blur-sm">
          <button
            onClick={() => setMode('companies')}
            className={`data-mono text-[11px] px-4 py-1.5 rounded-full font-semibold transition-all ${
              mode === 'companies'
                ? 'bg-[#00f5ff] text-[#0a0a0a]'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => setMode('candidates')}
            className={`data-mono text-[11px] px-4 py-1.5 rounded-full font-semibold transition-all ${
              mode === 'candidates'
                ? 'bg-[#00f5ff] text-[#0a0a0a]'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Candidates
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={mode === 'companies' ? '' : 'hidden'}>
        {companyDashboard}
      </div>
      <div className={mode === 'candidates' ? '' : 'hidden'}>
        {candidateDashboard}
      </div>
    </div>
  );
}
