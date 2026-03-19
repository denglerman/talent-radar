'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompanyWithSignals } from '@/types';
import RadarVisualization from './RadarVisualization';
import SignalHeatMap from './SignalHeatMap';
import SignalTimeline from './SignalTimeline';
import CompanyWatchlist from './CompanyWatchlist';
import CompanyDetailPanel from './CompanyDetailPanel';

interface Props {
  companiesWithSignals: CompanyWithSignals[];
  initialLastRefresh: string | null;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

let toastCounter = 0;

export default function Dashboard({ companiesWithSignals: initialData, initialLastRefresh }: Props) {
  const [companies, setCompanies] = useState<CompanyWithSignals[]>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watchlistCollapsed, setWatchlistCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(initialLastRefresh);
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
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companiesWithSignals);
        if (data.lastRefresh) setLastRefresh(data.lastRefresh);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const handleRefreshSignals = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh-signals', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        const parts: string[] = [];
        if (result.old_signals_purged > 0) parts.push(`${result.old_signals_purged} old removed`);
        if (result.new_signals_added > 0) parts.push(`${result.new_signals_added} new detected`);
        if (parts.length > 0) {
          showToast(`Signals refreshed — ${parts.join(', ')}`, 'success');
        } else {
          showToast('No new signals found', 'info');
        }
        await refreshData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to refresh signals', 'error');
      }
    } catch {
      showToast('Network error \u2014 could not refresh', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, showToast]);

  const handleAddCompany = useCallback(async (name: string, domain: string, tier: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: name, domain, tier }),
      });

      if (res.ok) {
        const newCompany = await res.json();
        showToast('Company added \u2014 scanning for signals...', 'success');

        // Trigger signal refresh for this company only
        fetch('/api/refresh-signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: newCompany.id }),
        }).then(() => refreshData()).catch(() => {});

        await refreshData();
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add company', 'error');
        return false;
      }
    } catch {
      showToast('Network error \u2014 could not add company', 'error');
      return false;
    }
  }, [refreshData, showToast]);

  const handleDeleteCompany = useCallback(async (companyId: string) => {
    try {
      const res = await fetch(`/api/companies?id=${companyId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Company removed', 'info');
        setSelectedId(prev => prev === companyId ? null : prev);
        await refreshData();
      } else {
        showToast('Failed to delete company', 'error');
      }
    } catch {
      showToast('Network error \u2014 could not delete', 'error');
    }
  }, [refreshData, showToast]);

  const selectedCompany = selectedId
    ? companies.find((c) => c.id === selectedId) || null
    : null;

  const allSignals = companies.flatMap((c) => c.signals);

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Watchlist */}
      <CompanyWatchlist
        companies={companies}
        selectedId={selectedId}
        onSelect={handleSelect}
        collapsed={watchlistCollapsed}
        onToggle={() => setWatchlistCollapsed(!watchlistCollapsed)}
        onAddCompany={handleAddCompany}
        onDeleteCompany={handleDeleteCompany}
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
              {companies.length} TARGETS
            </span>
            <span className="data-mono text-[10px] text-[#475569]">
              {allSignals.length} SIGNALS
            </span>

            {/* Last refresh timestamp */}
            {lastRefresh && (
              <span className="data-mono text-[10px] text-[#334155]">
                Last scan: {new Date(lastRefresh).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

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
              {refreshing ? 'Scanning...' : 'Refresh Signals'}
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
            <RadarVisualization
              companies={companies}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* Bottom: Heat Map + Timeline */}
          <div className="flex-1 grid grid-cols-2 gap-4 px-6 pb-4 min-h-0">
            <div className="overflow-auto rounded-lg border border-[#1e293b] bg-[#0d1117]/40 p-4">
              <SignalHeatMap
                companies={companies}
                onSelectCompany={handleSelect}
              />
            </div>
            <div className="overflow-hidden rounded-lg border border-[#1e293b] bg-[#0d1117]/40 p-4">
              <SignalTimeline
                signals={allSignals}
                companies={companies}
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
