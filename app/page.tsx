'use client';

import { useState, useMemo } from 'react';
import { useNetworkData } from './hooks/useNetworkData';
import NetworkGraph from './components/NetworkGraph';
import EntryForm from './components/EntryForm';
import GuestCard from './components/GuestCard';
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
    <main className="h-[100dvh] flex flex-col overflow-hidden bg-[#f8f5ef] text-stone-800">

      {/* ── Header ─────────────────────────────────────────────────── */}
      {/*
        Mobile entry phase: tall, centred showcase header fills ~40% of viewport.
        Mobile network phase: compact row so graph has maximum space.
        Desktop: always compact row (unchanged).
      */}
      <header
        className={[
          // Desktop: always a compact left/right row
          'flex-none sm:flex sm:flex-row sm:items-end sm:justify-between sm:h-auto sm:px-7 sm:pt-6 sm:pb-3 sm:text-left',
          phase === 'entry'
            // Mobile entry: tall centred column
            ? 'flex flex-col items-center justify-center text-center px-8 pt-10 pb-6 h-[38dvh]'
            // Mobile network: compact left-aligned row
            : 'flex flex-row items-end justify-between px-5 pt-5 pb-3',
        ].join(' ')}
      >
        <div className={phase === 'entry' ? 'sm:text-left' : ''}>
          <h1
            className={[
              'font-serif tracking-tight leading-none',
              phase === 'entry'
                ? 'text-5xl sm:text-3xl md:text-4xl'
                : 'text-2xl sm:text-3xl md:text-4xl',
            ].join(' ')}
          >
            Luke &amp; Krizia
          </h1>
          <p
            className={[
              'font-serif italic text-stone-800',
              phase === 'entry'
                ? 'text-base sm:text-sm mt-2 sm:mt-0.5'
                : 'text-xs sm:text-sm mt-0.5',
            ].join(' ')}
          >
            invite you to celebrate their marriage
          </p>

          {/* Venue + date — shown below subtitle on mobile entry only */}
          {phase === 'entry' && (
            <div className="sm:hidden mt-5 font-serif text-sm leading-relaxed text-stone-600">
              <p>{WEDDING_VENUE} &middot; {WEDDING_LOCATION}</p>
              <p className="italic">{WEDDING_DATE}</p>
            </div>
          )}
        </div>

        {/* Venue details — desktop only */}
        <div className="text-right font-serif text-sm leading-relaxed text-stone-800 hidden md:block">
          <p>{WEDDING_VENUE} &middot; {WEDDING_LOCATION}</p>
          <p>{WEDDING_DATE}</p>
        </div>
      </header>

      <div className="flex-none border-t mx-5 sm:mx-7 border-stone-200" />

      {/* ── Graph canvas ───────────────────────────────────────────── */}
      <div
        className={[
          'relative overflow-hidden',
          phase === 'network'
            ? 'flex-none h-[45dvh] sm:flex-1 sm:h-auto sm:min-h-0'
            : 'flex-1 min-h-0',
        ].join(' ')}
      >
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

        {/* Desktop overlay card */}
        {phase === 'network' && (
          <div className="hidden sm:block">
            <GuestCard node={selectedNode} onClose={handleClose} overlay={true} />
          </div>
        )}

        {/* ← full view button */}
        {phase === 'network' && (
          <button
            onClick={handleClose}
            className="absolute top-3 left-4 z-20 font-serif text-sm italic text-stone-800 hover:opacity-60 transition-opacity p-2 -m-2"
          >
            ← full view
          </button>
        )}

        {/* Entry form */}
        {phase === 'entry' && data && (
          <div className="absolute bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-10">
            <EntryForm validIds={validIds} onSubmit={handleSubmit} />
          </div>
        )}
      </div>

      {/* ── Mobile card section (below graph, in-flow) ─────────────── */}
      {phase === 'network' && (
        <div className="flex-1 min-h-0 sm:hidden">
          <GuestCard node={selectedNode} onClose={handleClose} overlay={false} />
        </div>
      )}

      {/* ── Footer — desktop only ───────────────────────────────────── */}
      <div className="flex-none border-t mx-7 border-stone-200 hidden sm:block" />
      <footer className="flex-none hidden sm:flex px-7 py-2.5 items-center justify-end text-stone-800">
        <p className="font-serif text-sm italic">
          {data && `${data.meta.nodeCount} guests · ${data.meta.edgeCount} connections · ${data.meta.communityCount} communities`}
        </p>
      </footer>
    </main>
  );
}
