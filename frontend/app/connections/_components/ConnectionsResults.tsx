"use client";

import { Alert, Badge } from "@/common/components";
import type { AirlineWithDestinations } from "@/common/api/airports";

interface ConnectionsResultsProps {
  routes: AirlineWithDestinations[];
  stale: boolean;
  activeAirline: string | null;
  onAirlineClick: (icaoCode: string) => void;
}

export function ConnectionsResults({
  routes,
  stale,
  activeAirline,
  onAirlineClick,
}: ConnectionsResultsProps) {
  const totalDestinations = new Set(
    routes.flatMap((r) => r.destinations.map((d) => d.icaoCode)),
  ).size;

  return (
    <div className="flex flex-col gap-3">
      {stale && (
        <Alert variant="info">
          Dane tras mogą być nieaktualne — problem z połączeniem z AeroAPI.
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
          {routes.length} {airlineWord(routes.length)} · {totalDestinations}{" "}
          {destinationWord(totalDestinations)}
        </p>
        {activeAirline && (
          <button
            type="button"
            onClick={() => onAirlineClick(activeAirline)}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle hover:text-ink cursor-pointer"
          >
            Wyczyść filtr ✕
          </button>
        )}
      </div>

      <ul className="border-2 border-ink divide-y divide-ink/20">
        {routes.map(({ airline, destinations }) => {
          const isActive = activeAirline === airline.icaoCode;
          return (
            <li key={airline.icaoCode}>
              <button
                type="button"
                onClick={() => onAirlineClick(airline.icaoCode)}
                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                  isActive
                    ? "bg-navy text-white"
                    : "hover:bg-[var(--color-lime)]/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-white" : "text-ink"
                      }`}
                    >
                      {airline.name}
                    </p>
                    <p
                      className={`font-mono text-[11px] mt-0.5 ${
                        isActive ? "text-blue-200" : "text-ink-subtle"
                      }`}
                    >
                      {airline.icaoCode}
                      {airline.iataCode ? ` · ${airline.iataCode}` : ""}
                    </p>
                  </div>
                  <Badge variant={isActive ? "navy" : "default"}>
                    {destinations.length} {destinationWord(destinations.length)}
                  </Badge>
                </div>
              </button>

              {isActive && (
                <ul className="bg-surface border-t border-ink/20 max-h-60 overflow-y-auto">
                  {destinations.map((dest) => (
                    <li
                      key={dest.icaoCode}
                      className="px-4 py-2.5 border-b border-ink/10 last:border-b-0"
                    >
                      <p className="text-sm text-ink font-medium">
                        {dest.city?.name ?? dest.name}
                        {dest.city?.countryName ? (
                          <span className="text-ink-subtle font-normal">
                            {" "}
                            · {dest.city.countryName}
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-[11px] text-ink-subtle mt-0.5">
                        {dest.icaoCode}
                        {dest.iataCode ? ` / ${dest.iataCode}` : ""} ·{" "}
                        {dest.name}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function airlineWord(count: number): string {
  if (count === 1) return "linia";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "linie";
  return "linii";
}

function destinationWord(count: number): string {
  if (count === 1) return "destynacja";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "destynacje";
  return "destynacji";
}
