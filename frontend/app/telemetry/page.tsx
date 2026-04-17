'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/common/components';

const TelemetryMapView = dynamic(() => import('./_components/TelemetryMapView'), {
    ssr: false,
    loading: () => (
        <div className="h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink flex items-center justify-center bg-[var(--color-bg)]">
            <div className="flex items-center gap-3">
                <Spinner size="md" />
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                    Inicjalizacja środowiska WebGL...
                </span>
            </div>
        </div>
    ),
});

export default function TelemetryPage() {
    return (
        <TelemetryMapView />
    );
}