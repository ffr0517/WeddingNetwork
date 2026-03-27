'use client';

import { useEffect, useState } from 'react';
import { NetworkData } from '../lib/types';

export function useNetworkData(): NetworkData | null {
  const [data, setData] = useState<NetworkData | null>(null);

  useEffect(() => {
    fetch('/data/network.json')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return data;
}
