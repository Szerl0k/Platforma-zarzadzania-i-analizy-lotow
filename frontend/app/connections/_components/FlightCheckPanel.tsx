"use client";

import { Alert, Badge, Spinner } from "@/common/components";
import type {
  DirectRoute,
  ConnectingRoute,
  RouteCheckResult,
} from "@/common/api/airports";
import type { Airport } from "@/common/api/airports";

interface FlightCheckPanelProps {
  origin: Airport;
  destination: Airport;
  result: RouteCheckResult | null;
  loading: boolean;
  error: string | null;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export function FlightCheckPanel({
  origin,
  destination,
  result,
  loading,
  error,
  activeFilter,
  onFilterChange,
}: FlightCheckPanelProps) {
  return (
    <div className="border-2 border-ink bg-surface">
      <div className="px-4 py-3 border-b-2 border-ink">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          Dostępne połączenia
        </p>
        <p className="font-sans text-sm font-medium text-ink mt-0.5">
          {origin.city?.name ?? origin.name}
          {origin.iataCode ? ` (${origin.iataCode})` : ` (${origin.icaoCode})`}
          <span className="text-ink-subtle mx-2">→</span>
          {destination.city?.name ?? destination.name}
          {destination.iataCode
            ? ` (${destination.iataCode})`
            : ` (${destination.icaoCode})`}
        </p>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {loading && (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="sm" tone="ink" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
              Sprawdzam połączenia…
            </span>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && result !== null && (
          <>
            <DirectSection
              routes={result.direct}
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
            <ConnectingSection
              routes={result.connecting}
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface DirectSectionProps {
  routes: DirectRoute[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

function DirectSection({
  routes,
  activeFilter,
  onFilterChange,
}: DirectSectionProps) {
  const isActive = activeFilter === "direct";

  function handleClick() {
    onFilterChange(isActive ? null : "direct");
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
          Loty bezpośrednie
        </h3>
        <Badge variant={routes.length > 0 ? "info" : "default"}>
          {routes.length}
        </Badge>
      </div>

      {routes.length === 0 ? (
        <p className="font-mono text-[11px] text-ink-subtle">
          Brak bezpośrednich połączeń między wybranymi lotniskami.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {routes.map((r, idx) => (
            <li
              key={`${r.airlineIcao ?? r.airlineIata ?? idx}`}
              onClick={handleClick}
              className={`flex items-center justify-between gap-3 border-2 border-ink px-3 py-2.5 cursor-pointer transition-colors ${
                isActive
                  ? "bg-[var(--color-lime)]"
                  : "hover:bg-[var(--color-lime)]/5"
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${"text-ink"}`}>
                  {r.airlineName ?? r.airlineIata ?? r.airlineIcao ?? "—"}
                </p>
                <p
                  className={`font-mono text-[11px] mt-0.5 ${isActive ? "text-ink-subtle" : "text-ink-subtle"}`}
                >
                  {[r.airlineIcao, r.airlineIata].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Badge variant="info">bezpośredni</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ConnectingSectionProps {
  routes: ConnectingRoute[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

function ConnectingSection({
  routes,
  activeFilter,
  onFilterChange,
}: ConnectingSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
          Możliwe lotniska przesiadkowe
        </h3>
        <Badge variant={routes.length > 0 ? "default" : "default"}>
          {routes.length}
        </Badge>
      </div>

      {routes.length === 0 ? (
        <p className="font-mono text-[11px] text-ink-subtle">
          Brak znanych lotnisk przesiadkowych dla tej trasy.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {routes.map((r) => {
            const isActive = activeFilter === r.stopAirportIcao;
            return (
              <li
                key={r.stopAirportIcao}
                onClick={() =>
                  onFilterChange(isActive ? null : r.stopAirportIcao)
                }
                className={`flex items-center justify-between gap-3 border-2 border-ink px-3 py-2.5 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[var(--color-lime)]"
                    : "hover:bg-[var(--color-lime)]/5"
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${"text-ink"}`}>
                    {r.stopCityName ?? r.stopAirportName ?? r.stopAirportIcao}
                  </p>
                  <p
                    className={`font-mono text-[11px] mt-0.5 ${isActive ? "text-ink-subtle" : "text-ink-subtle"}`}
                  >
                    {r.stopAirportIcao}
                    {r.stopAirportIata ? ` / ${r.stopAirportIata}` : ""}
                    {r.stopAirportName ? ` · ${r.stopAirportName}` : ""}
                  </p>
                </div>
                <Badge variant="default">via</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
