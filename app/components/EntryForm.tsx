'use client';

import { useState } from 'react';

interface Props {
  validIds: Set<string>;
  onSubmit: (id: string) => void;
}

export default function EntryForm({ validIds, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idUpper = value.trim().toUpperCase();
    const match = validIds.has(idUpper) ? idUpper : validIds.has(value.trim()) ? value.trim() : null;
    if (match) {
      setError('');
      onSubmit(match);
    } else {
      setError('We don\'t recognise that number — check your invitation and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-end gap-2 w-full sm:w-64">
      <input
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        placeholder="your invite number"
        className="
          w-full text-center font-serif text-base px-3 py-2
          border border-stone-300 focus:border-stone-500
          bg-white/50 text-stone-700 placeholder-stone-300
          backdrop-blur-sm outline-none
          transition-colors duration-200 rounded-none
        "
        autoComplete="off"
        spellCheck={false}
      />
      {error && (
        <p className="text-xs text-[#902125] text-right leading-tight">{error}</p>
      )}
      <button
        type="submit"
        className="
          w-full py-2 font-serif text-xs uppercase tracking-[0.2em]
          border border-stone-500 text-stone-800
          hover:border-stone-900 hover:text-stone-900
          transition-colors duration-200
        "
      >
        find my constellation
      </button>
    </form>
  );
}
