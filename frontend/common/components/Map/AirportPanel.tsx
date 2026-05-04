"use client";

import { useEffect, useState } from "react";
import { Spinner, Alert, Button } from "@/common/components";
import {
  getAirportRoutes,
  type Airport,
  type AirlineWithDestinations,
} from "@/common/api/airports";

interface AirportPanelProps {
  airport: Airport;
  selectedAirlineIcaos: Set<string>;
  onClose: () => void;
  onAirlineToggle: (airlineIcao: string, destinations: Airport[]) => void;
  onToggleAll: (routes: AirlineWithDestinations[]) => void;
}

interface RoutesState {
  routes: AirlineWithDestinations[];
  loading: boolean;
  error: string | null;
}

export function AirportPanel({
  airport,
  selectedAirlineIcaos,
  onClose,
  onAirlineToggle,
  onToggleAll,
}: AirportPanelProps) {
  const [{ routes, loading, error }, setRoutesState] = useState<RoutesState>({
    routes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    getAirportRoutes(airport.icaoCode)
      .then((data) => {
        if (!cancelled)
          setRoutesState({ routes: data, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled)
          setRoutesState({
            routes: [],
            loading: false,
            error: "Nie udało się pobrać tras lotniczych.",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [airport.icaoCode]);

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b-2 border-ink shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Lotnisko
            </p>
            <p className="font-mono font-bold text-sm uppercase tracking-widest text-ink truncate">
              {airport.icaoCode}
              {airport.iataCode && (
                <span className="text-ink-muted font-normal">
                  {" "}
                  / {airport.iataCode}
                </span>
              )}
            </p>
            <p className="text-sm text-ink font-medium leading-tight mt-0.5 truncate">
              {airport.name}
            </p>
            {airport.city && (
              <p className="text-xs text-ink-muted truncate">
                {airport.city.name}
                {airport.city.countryName && `, ${airport.city.countryName}`}
              </p>
            )}
            <p className="text-xs text-ink-muted font-mono mt-0.5">
              Stefa Czasowa: {airport.timezone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-white transition-colors text-sm font-bold"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Airlines section header */}
      <div className="px-3 py-2 border-b border-border-subtle shrink-0 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          Linie lotnicze · połączenia wylatujące
        </p>
        {!loading &&
          !error &&
          routes.length > 0 &&
          (() => {
            const allSelected = routes.every((r) =>
              selectedAirlineIcaos.has(r.airline.icaoCode),
            );
            return (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onToggleAll(routes)}
                className={allSelected ? "!bg-[var(--color-lime)]" : ""}
              >
                Wszystkie
              </Button>
            );
          })()}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-ink-muted">
            <Spinner size="md" />
            <p className="font-mono text-xs uppercase tracking-widest">
              Pobieram trasy…
            </p>
          </div>
        )}

        {error && (
          <div className="p-3">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {!loading && !error && routes.length === 0 && (
          <p className="p-4 text-sm text-ink-muted font-mono">
            Brak zaplanowanych tras w najbliższych 14 dniach.
          </p>
        )}

        {!loading && !error && routes.length > 0 && (
          <ul className="divide-y divide-border-subtle">
            {routes.map(({ airline, destinations }) => {
              const isSelected = selectedAirlineIcaos.has(airline.icaoCode);
              return (
                <li key={airline.icaoCode}>
                  <button
                    onClick={() =>
                      onAirlineToggle(airline.icaoCode, destinations)
                    }
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      isSelected ? "bg-navy text-white" : "hover:bg-bg"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-ink"}`}
                    >
                      {airline.name}
                    </p>
                    <p
                      className={`text-xs font-mono mt-0.5 ${isSelected ? "text-blue-200" : "text-ink-muted"}`}
                    >
                      {airline.icaoCode}
                      {airline.iataCode && ` · ${airline.iataCode}`}
                      {" · "}
                      {destinations.length}{" "}
                      {destinations.length === 1
                        ? "trasa"
                        : destinations.length < 5
                          ? "trasy"
                          : "tras"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
