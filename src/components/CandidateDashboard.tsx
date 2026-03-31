'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CandidateWithSignals } from '@/types';
import CandidateRadarVisualization from './CandidateRadarVisualization';
import CandidateSignalTimeline from './CandidateSignalTimeline';
import CandidateWatchlist, { AddCandidateData } from './CandidateWatchlist';
import CandidateDetailPanel from './CandidateDetailPanel';

interface Props {
  candidatesWithSignals: CandidateWithSignals[];
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

let toastCounter = 0;

export default function CandidateDashboard({ candidatesWithSignals: initialData }: Props) {
  const [candidates, setCandidates] = useState<CandidateWithSignals[]>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watchlistCollapsed, setWatchlistCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/candidate-data');
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidatesWithSignals);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const handleRefreshSignals = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh-candidate-signals', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (result.new_signals_added > 0) {
          showToast(`Scanned ${result.candidates_checked} candidates \u2014 ${result.new_signals_added} signals detected`, 'success');
        } else {
          showToast(`Scanned ${result.candidates_checked} candidates \u2014 no new signals`, 'info');
        }
        await refreshData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to refresh candidate signals', 'error');
      }
    } catch {
      showToast('Network error \u2014 could not refresh', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, showToast]);

  const handleAddCandidate = useCallback(async (data: AddCandidateData) => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newCandidate = await res.json();
        showToast('Candidate added \u2014 scanning for signals...', 'success');

        // Trigger signal refresh for this candidate only
        fetch('/api/refresh-candidate-signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: newCandidate.id }),
        }).then(() => refreshData()).catch(() => {});

        await refreshData();
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add candidate', 'error');
        return false;
      }
    } catch {
      showToast('Network error \u2014 could not add candidate', 'error');
      return false;
    }
  }, [refreshData, showToast]);

  const handleDeleteCandidate = useCallback(async (candidateId: string) => {
    try {
      const res = await fetch(`/api/candidates?id=${candidateId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Candidate removed', 'info');
        setSelectedId(prev => prev === candidateId ? null : prev);
        await refreshData();
      } else {
        showToast('Failed to delete candidate', 'error');
      }
    } catch {
      showToast('Network error \u2014 could not delete', 'error');
    }
  }, [refreshData, showToast]);

  const selectedCandidate = selectedId
    ? candidates.find((c) => c.id === selectedId) || null
    : null;

  const allSignals = candidates.flatMap((c) => c.signals);

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Watchlist */}
      <CandidateWatchlist
        candidates={candidates}
        selectedId={selectedId}
        onSelect={handleSelect}
        collapsed={watchlistCollapsed}
        onToggle={() => setWatchlistCollapsed(!watchlistCollapsed)}
        onAddCandidate={handleAddCandidate}
        onDeleteCandidate={handleDeleteCandidate}
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
              TALENT RADAR
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="data-mono text-[10px] text-[#475569]">
              {candidates.length} CANDIDATES
            </span>
            <span className="data-mono text-[10px] text-[#475569]">
              {allSignals.length} SIGNALS
            </span>

            {/* Refresh button */}
            <button
              onClick={handleRefreshSignals}
              disabled={refreshing}
              className="flex items-center gap-1.5 data-mono text-[10px] text-[#00f5ff] border border-[#00f5ff]/30 rounded-md px-2.5 py-1.5 hover:bg-[#00f5ff]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path
                  d="M10.5 6A4.5 4.5 0 1 1 6 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M6 1.5L8 1.5L6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {refreshing ? 'Scanning...' : 'Refresh Candidates'}
            </button>

            <span className="data-mono text-[10px] text-[#00f5ff]">
              LIVE
            </span>
          </div>
        </motion.header>

        {/* Main grid */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Top: Radar */}
          <div className="flex-shrink-0 flex items-center justify-center py-4 px-6" style={{ height: '55%' }}>
            <CandidateRadarVisualization
              candidates={candidates}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* Bottom: Signal Timeline (full width for candidates) */}
          <div className="flex-1 px-6 pb-4 min-h-0">
            <div className="overflow-hidden rounded-lg border border-[#1e293b] bg-[#0d1117]/40 p-4 h-full">
              <CandidateSignalTimeline
                signals={allSignals}
                candidates={candidates}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      <CandidateDetailPanel
        candidate={selectedCandidate}
        onClose={() => setSelectedId(null)}
        onDeleteCandidate={handleDeleteCandidate}
      />

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`data-mono text-[11px] px-4 py-2.5 rounded-lg border backdrop-blur-sm ${
                toast.type === 'success'
                  ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                  : toast.type === 'error'
                  ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                  : 'bg-[#00f5ff]/10 border-[#00f5ff]/30 text-[#00f5ff]'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
