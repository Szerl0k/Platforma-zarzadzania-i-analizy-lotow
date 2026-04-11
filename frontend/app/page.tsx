'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/common/components';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Spinner size="md" />
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Ladowanie mapy...
        </span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <MapView />;
}
