import { APP_NAME } from "@/common/config";
import { Alert, Spinner } from "@/common/components";
import { MapSearch } from "@/common/components/Map/MapSearch";
import type { Airport } from "@/common/api/airports";

interface MapOverlayProps {
  flightsCount: number;
  totalCount?: number;
  loading: boolean;
  error: Error | string | null;
  onAirportSelect: (airport: Airport, results: Airport[]) => void;
  children?: React.ReactNode;
}

export function MapOverlay({
  flightsCount,
  totalCount,
  loading,
  error,
  onAirportSelect,
  children,
}: MapOverlayProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 pointer-events-none">
      <div className="border-2 border-ink bg-surface shadow-brut pointer-events-auto flex items-stretch">
        <div className="px-3 py-2 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted whitespace-nowrap">
              {APP_NAME} · Telemetria
            </p>
            {loading && <Spinner size="sm" />}
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink font-bold whitespace-nowrap">
            Widoczne statki: {flightsCount}
            {totalCount !== undefined && totalCount !== flightsCount && (
              <span className="text-ink-muted font-normal">
                {" "}
                / {totalCount}
              </span>
            )}
          </p>
        </div>
        <div className="border-l-2 border-ink flex items-center">
          <MapSearch onSelect={onAirportSelect} />
        </div>
      </div>
      {error && (
        <div className="pointer-events-auto">
          <Alert variant="error">
            {typeof error === "string" ? error : error.message}
          </Alert>
        </div>
      )}
      {children && <div className="pointer-events-auto">{children}</div>}
    </div>
  );
}
