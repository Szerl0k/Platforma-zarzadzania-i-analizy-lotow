"use client";

import { Badge, Card } from "@/common/components";
import type { CityBreakProposal } from "@/common/api/cityBreak";

interface ResultsListProps {
  items: CityBreakProposal[];
  selectedIcao: string | null;
  onSelect: (proposal: CityBreakProposal) => void;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function ResultsList({
  items,
  selectedIcao,
  onSelect,
}: ResultsListProps) {
  if (items.length === 0) {
    return (
      <Card variant="flat" padding="md">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
          Brak propozycji dla wybranych kryteriów. Spróbuj zwiększyć zakres dat
          lub poluzować filtry.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((p) => {
        const isSelected = selectedIcao === p.destinationIcao;
        return (
          <button
            key={p.destinationIcao}
            type="button"
            onClick={() => onSelect(p)}
            className={`text-left transition-[transform,box-shadow] duration-[120ms] ${
              isSelected ? "-translate-x-[2px] -translate-y-[2px]" : ""
            }`}
          >
            <Card
              variant={isSelected ? "elevated" : "default"}
              padding="md"
              className={`cursor-pointer hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brut transition-[transform,box-shadow] duration-[120ms] ${
                isSelected ? "shadow-brut bg-[var(--color-lime)]/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-sans text-base font-medium text-ink">
                    {p.cityName ?? p.airportName}
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                    {p.countryName ?? "—"} · {p.destinationIcao}
                    {p.destinationIata ? ` / ${p.destinationIata}` : ""}
                  </p>
                </div>
                <Badge variant="default">
                  {formatDuration(p.minFlightDurationMinutes)}
                </Badge>
              </div>
              <p className="font-mono text-[11px] text-ink-subtle mb-2">
                {p.airportName}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                  {p.flightCount} {flightWord(p.flightCount)} w okresie
                </span>
                {p.distanceKm !== null && (
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                    {p.distanceKm} km
                  </span>
                )}
              </div>
              {p.airlines.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.airlines.slice(0, 6).map((a) => (
                    <Badge key={a} variant="default">
                      {a}
                    </Badge>
                  ))}
                  {p.airlines.length > 6 && (
                    <Badge variant="default">+{p.airlines.length - 6}</Badge>
                  )}
                </div>
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function flightWord(count: number): string {
  if (count === 1) return "lot";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "loty";
  return "lotów";
}
