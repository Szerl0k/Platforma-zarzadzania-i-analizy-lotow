import {APP_NAME} from "@/common/config";
import { Alert, Spinner } from '@/common/components';


interface MapOverlayProps {
    flightsCount: number;
    loading: boolean;
    error: Error | string | null;
}

export function MapOverlay({ flightsCount, loading, error }: MapOverlayProps) {
    return (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 pointer-events-none">
            <div className="border-2 border-ink bg-surface px-3 py-2 shadow-brut pointer-events-auto flex flex-col gap-1 min-w-[200px]">
                <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                        {APP_NAME} · Telemetria
                    </p>
                    {loading && <Spinner size="sm" />}
                </div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink font-bold">
                    Widoczne statki: {flightsCount}
                </p>
            </div>{error && (<div className="pointer-events-auto"><Alert variant="error">{typeof error === 'string' ? error : error.message}</Alert></div>)}
        </div>
    );
}