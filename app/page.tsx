'use client';

import { useState, useMemo } from 'react';
import { useNetworkData } from './hooks/useNetworkData';
import NetworkGraph from './components/NetworkGraph';
import EntryForm from './components/EntryForm';
import GuestCard from './components/GuestCard';
import DemoNotice from './components/DemoNotice';
import Legend from './components/Legend';
import { NetworkNode } from './lib/types';
import { DEMO_NODE_ID, WEDDING_DATE, WEDDING_VENUE, WEDDING_LOCATION } from './lib/constants';

export default function Home() {
  const data = useNetworkData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [phase, setPhase] = useState<'entry' | 'network'>('entry');

  const validIds = useMemo(
    () => new Set(data?.nodes.map((n) => n.id) ?? []),
    [data]
  );

  const selectedNode: NetworkNode | null = useMemo(
    () => data?.nodes.find((n) => n.id === selectedId) ?? null,
    [data, selectedId]
  );

  const handleSubmit = (id: string) => {
    setIsDemo(false);
    setSelectedId(id);
    setPhase('network');
  };

  const handleDemo = () => {
    setIsDemo(true);
    setSelectedId(DEMO_NODE_ID);
    setPhase('network');
  };

  const handleClose = () => {
    setSelectedId(null);
    setPhase('entry');
    setIsDemo(false);
  };

  const handleNodeClick = (id: string) => {
    if (id === selectedId) return;
    // Clicking other nodes re-zooms but doesn't show their personal card
    if (phase === 'network') {
      setSelectedId(id);
    }
  };

  const bg = darkMode
    ? 'bg-[#0e0c0a] text-stone-200'
    : 'bg-[#faf8f4] text-stone-800';

  const headerSubtle = darkMode ? 'text-stone-500' : 'text-stone-400';
  const divider = darkMode ? 'border-stone-700' : 'border-stone-200';

  return (
    <main
      className={`h-screen flex flex-col overflow-hidden transition-colors duration-700 ${bg}`}
    >
      {/* ── Dark mode toggle ───────────────────────────────────────── */}
      <button
        onClick={() => setDarkMode((d) => !d)}
        className={`absolute top-5 right-5 z-30 text-xs uppercase tracking-widest ${headerSubtle} hover:opacity-80 transition-opacity`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀ light' : '✦ dark'}
      </button>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="pt-10 pb-0 px-8 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-none">
            Luke &amp; Krizia
          </h1>
          <p className={`font-serif text-sm mt-1 italic ${headerSubtle}`}>
            invite you to celebrate their marriage
          </p>
        </div>
        <div className={`text-right font-serif text-sm leading-relaxed ${headerSubtle} hidden md:block`}>
          <p>{WEDDING_VENUE}</p>
          <p>{WEDDING_LOCATION}</p>
          <p className="mt-1">{WEDDING_DATE}</p>
        </div>
      </header>

      <div className={`border-t mx-8 mt-6 ${divider}`} />

      {/* ── Graph + overlay ───────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {data ? (
          <NetworkGraph
            data={data}
            selectedId={selectedId}
            darkMode={darkMode}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${headerSubtle}`}>
            <span className="font-serif text-sm animate-pulse">loading constellation…</span>
          </div>
        )}

        {/* Demo notice */}
        {isDemo && <DemoNotice darkMode={darkMode} />}

        {/* Reset button */}
        {phase === 'network' && (
          <button
            onClick={handleClose}
            className={`absolute top-4 left-4 z-20 text-xs uppercase tracking-widest transition-opacity
              ${darkMode ? 'text-stone-500 hover:text-stone-200' : 'text-stone-400 hover:text-stone-700'}`}
          >
            ← full view
          </button>
        )}

        {/* Guest card */}
        {phase === 'network' && (
          <GuestCard
            node={selectedNode}
            isDemo={isDemo}
            darkMode={darkMode}
            onClose={handleClose}
          />
        )}

        {/* Entry overlay */}
        {phase === 'entry' && data && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="pointer-events-auto">
              <EntryForm
                validIds={validIds}
                onSubmit={handleSubmit}
                onDemo={handleDemo}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}
      </div>

      <div className={`border-t mx-8 ${divider}`} />

      {/* ── Footer / legend ───────────────────────────────────────── */}
      <footer className="px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {data && <Legend communities={data.communities} darkMode={darkMode} />}
        <div className={`font-serif text-xs italic ${headerSubtle} text-right`}>
          {data && (
            <>
              {data.meta.nodeCount} guests &middot;{' '}
              {data.meta.edgeCount} connections &middot;{' '}
              {data.meta.communityCount} communities
            </>
          )}
        </div>
      </footer>

      {/* Mobile venue details */}
      <div className={`px-8 pb-6 font-serif text-xs text-center ${headerSubtle} md:hidden`}>
        {WEDDING_VENUE} &middot; {WEDDING_LOCATION} &middot; {WEDDING_DATE}
      </div>
    </main>
  );
}
