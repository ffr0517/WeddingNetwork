'use client';

import { useState, useMemo } from 'react';
import { useNetworkData } from './hooks/useNetworkData';
import NetworkGraph from './components/NetworkGraph';
import EntryForm from './components/EntryForm';
import GuestCard from './components/GuestCard';
import Legend from './components/Legend';
import { NetworkNode } from './lib/types';
import { WEDDING_DATE, WEDDING_VENUE, WEDDING_LOCATION } from './lib/constants';

export default function Home() {
  const data = useNetworkData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    setSelectedId(id);
    setPhase('network');
  };

  const handleClose = () => {
    setSelectedId(null);
    setPhase('entry');
  };

  const handleNodeClick = (id: string) => {
    if (id === selectedId || phase !== 'network') return;
    setSelectedId(id);
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[#f8f5ef] text-stone-800">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex-none px-5 sm:px-7 pt-5 sm:pt-6 pb-3 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl tracking-tight leading-none">
            Luke &amp; Krizia
          </h1>
          <p className="font-serif text-xs sm:text-sm mt-0.5 italic text-stone-800">
            invite you to celebrate their marriage
          </p>
        </div>

        {/* Venue details — desktop only */}
        <div className="text-right font-serif text-sm leading-relaxed text-stone-800 hidden md:block">
          <p>{WEDDING_VENUE} &middot; {WEDDING_LOCATION}</p>
          <p>{WEDDING_DATE}</p>
        </div>
      </header>

      <div className="flex-none border-t mx-5 sm:mx-7 border-stone-200" />

      {/* ── Graph canvas ───────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {data ? (
          <NetworkGraph
            data={data}
            selectedId={selectedId}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-700">
            <span className="font-serif text-sm animate-pulse">loading constellation…</span>
          </div>
        )}

        {/* Guest card — top on mobile so graph shows below, bottom-center on desktop */}
        {phase === 'network' && (
          <GuestCard node={selectedNode} onClose={handleClose} />
        )}

        {/* ← full view button */}
        {phase === 'network' && (
          <button
            onClick={handleClose}
            className="absolute top-3 left-4 z-20 font-serif text-sm italic text-stone-800 hover:opacity-60 transition-opacity"
          >
            ← full view
          </button>
        )}

        {/* Entry form:
            mobile — full-width, centered, near bottom
            desktop — fixed-width, right-aligned, bottom-right corner */}
        {phase === 'entry' && data && (
          <div className="absolute bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-10">
            <EntryForm validIds={validIds} onSubmit={handleSubmit} />
          </div>
        )}
      </div>

      <div className="flex-none border-t mx-5 sm:mx-7 border-stone-200" />

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="flex-none px-5 sm:px-7 py-2.5 flex items-center justify-between text-stone-800">
        {data && <Legend communities={data.communities} />}
        <p className="font-serif text-sm italic hidden sm:block">
          {data && `${data.meta.nodeCount} guests · ${data.meta.edgeCount} connections · ${data.meta.communityCount} communities`}
        </p>
      </footer>
    </main>
  );
}
