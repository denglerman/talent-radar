'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CompanyWithSignals } from '@/types';
import RadarVisualization from './RadarVisualization';
import SignalHeatMap from './SignalHeatMap';
import SignalTimeline from './SignalTimeline';
import CompanyWatchlist from './CompanyWatchlist';
import CompanyDetailPanel from './CompanyDetailPanel';

interface Props {
  companiesWithSignals: CompanyWithSignals[];
}

export default function Dashboard({ companiesWithSignals }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watchlistCollapsed, setWatchlistCollapsed] = useState(false);

  const selectedCompany = selectedId
    ? companiesWithSignals.find((c) => c.id === selectedId) || null
    : null;

  const allSignals = companiesWithSignals.flatMap((c) => c.signals);

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Watchlist */}
      <CompanyWatchlist
        companies={companiesWithSignals}
        selectedId={selectedId}
        onSelect={handleSelect}
        collapsed={watchlistCollapsed}
        onToggle={() => setWatchlistCollapsed(!watchlistCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between px-6 py-3 border-b border-[#1e293b] bg-[#0a0a0a]/80 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00f5ff] animate-pulse" />
            <h1 className="data-mono text-sm font-bold text-white tracking-wider">
              COGNITION TALENT RADAR
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="data-mono text-[10px] text-[#475569]">
              {companiesWithSignals.length} TARGETS
            </span>
            <span className="data-mono text-[10px] text-[#475569]">
              {allSignals.length} SIGNALS
            </span>
            <span className="data-mono text-[10px] text-[#00f5ff]">
              LIVE
            </span>
          </div>
        </motion.header>

        {/* Main grid */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Top: Radar */}
          <div className="flex-shrink-0 flex items-center justify-center py-4 px-6" style={{ height: '55%' }}>
            <RadarVisualization
              companies={companiesWithSignals}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* Bottom: Heat Map + Timeline */}
          <div className="flex-1 grid grid-cols-2 gap-4 px-6 pb-4 min-h-0">
            <div className="overflow-auto rounded-lg border border-[#1e293b] bg-[#0d1117]/40 p-4">
              <SignalHeatMap
                companies={companiesWithSignals}
                onSelectCompany={handleSelect}
              />
            </div>
            <div className="overflow-hidden rounded-lg border border-[#1e293b] bg-[#0d1117]/40 p-4">
              <SignalTimeline
                signals={allSignals}
                companies={companiesWithSignals}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      <CompanyDetailPanel
        company={selectedCompany}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
