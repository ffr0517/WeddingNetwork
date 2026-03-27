'use client';

import { useState } from 'react';

interface Props {
  validIds: Set<string>;
  onSubmit: (id: string) => void;
  onDemo: () => void;
  darkMode: boolean;
}

export default function EntryForm({ validIds, onSubmit, onDemo, darkMode }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const border = darkMode ? 'border-stone-600 focus:border-stone-300' : 'border-stone-300 focus:border-stone-700';
  const bg = darkMode ? 'bg-stone-800/60 text-stone-100 placeholder-stone-500' : 'bg-white/60 text-stone-800 placeholder-stone-400';
  const btnBg = darkMode ? 'bg-stone-100 text-stone-900 hover:bg-white' : 'bg-stone-800 text-white hover:bg-stone-900';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim().toUpperCase();
    // Try exact match first, then as numeric string
    const match = validIds.has(id) ? id : validIds.has(value.trim()) ? value.trim() : null;
    if (match) {
      setError('');
      onSubmit(match);
    } else {
      setError('We don\'t recognise that number — check your invitation and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-xs">
      <input
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        placeholder="your invite number"
        className={`
          w-full text-center font-serif text-lg px-4 py-3
          border backdrop-blur-sm rounded-sm outline-none
          transition-colors duration-200
          ${border} ${bg}
        `}
        autoComplete="off"
        spellCheck={false}
      />
      {error && (
        <p className="text-xs text-[#902125] text-center">{error}</p>
      )}
      <button
        type="submit"
        className={`w-full py-3 text-sm uppercase tracking-widest transition-colors duration-200 rounded-sm ${btnBg}`}
      >
        Find my constellation
      </button>
      <button
        type="button"
        onClick={onDemo}
        className={`text-xs underline underline-offset-4 mt-1 ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-400 hover:text-stone-700'} transition-colors`}
      >
        Just visiting? View demo
      </button>
    </form>
  );
}
