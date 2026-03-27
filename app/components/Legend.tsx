'use client';

import { Community } from '../lib/types';

interface Props {
  communities: Community[];
  darkMode: boolean;
}

export default function Legend({ communities, darkMode }: Props) {
  const text = darkMode ? 'text-stone-400' : 'text-stone-500';

  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-2 text-xs ${text}`}>
      {communities.map((c) => (
        <div key={c.name} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
            style={{ backgroundColor: c.hex }}
          />
          <span className="uppercase tracking-wide">{c.name}</span>
        </div>
      ))}
    </div>
  );
}
