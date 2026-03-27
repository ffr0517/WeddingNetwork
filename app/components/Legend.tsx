'use client';

import { Community } from '../lib/types';

interface Props {
  communities: Community[];
}

export default function Legend({ communities }: Props) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-800">
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
