"use client";

import { useState } from "react";
import { Input, Button, Badge } from "@/common/components";
import type {
  FlightFilters,
  FlightFilterOptions,
  FilterOption,
} from "@/app/telemetry/_utils/flightFilters";

interface FlightFilterPanelProps {
  filters: FlightFilters;
  options: FlightFilterOptions;
  activeCount: number;
  visibleCount: number;
  totalCount: number;
  onFlightNumberChange: (value: string) => void;
  onToggleAirline: (code: string) => void;
  onToggleCountry: (country: string) => void;
  onToggleCategory: (category: number) => void;
  onClear: () => void;
}

export function FlightFilterPanel({
  filters,
  options,
  activeCount,
  visibleCount,
  totalCount,
  onFlightNumberChange,
  onToggleAirline,
  onToggleCountry,
  onToggleCategory,
  onClear,
}: FlightFilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-72 border-2 border-ink bg-surface shadow-brut">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-bg transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Filtry
          </span>
          {activeCount > 0 && <Badge variant="info">{activeCount}</Badge>}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-muted">
            {visibleCount}/{totalCount}
          </span>
          <span className="font-mono text-xs text-ink">
            {expanded ? "▴" : "▾"}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="border-t-2 border-ink px-3 py-3 flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Numer lotu
            </label>
            <Input
              placeholder="np. LOT, RYR123"
              value={filters.flightNumber}
              onChange={(e) => onFlightNumberChange(e.target.value)}
              className="h-9 font-mono uppercase placeholder:normal-case"
            />
          </div>

          <FilterGroup
            title="Linia (ICAO)"
            options={options.airlines}
            isSelected={(v) => filters.airlines.has(v)}
            onToggle={onToggleAirline}
          />

          <FilterGroup
            title="Kraj rejestracji"
            options={options.countries}
            isSelected={(v) => filters.countries.has(v)}
            onToggle={onToggleCountry}
          />

          <FilterGroup
            title="Typ (kategoria)"
            options={options.categories}
            isSelected={(v) => filters.categories.has(v)}
            onToggle={onToggleCategory}
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Wyczyść filtry
          </Button>
        </div>
      )}
    </div>
  );
}

interface FilterGroupProps<T extends string | number> {
  title: string;
  options: FilterOption<T>[];
  isSelected: (value: T) => boolean;
  onToggle: (value: T) => void;
}

function FilterGroup<T extends string | number>({
  title,
  options,
  isSelected,
  onToggle,
}: FilterGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
        {title}
      </span>
      {options.length === 0 ? (
        <p className="font-mono text-[11px] text-ink-subtle px-1 py-0.5">
          Brak danych
        </p>
      ) : (
        <ul className="border-2 border-ink divide-y divide-ink/15 max-h-36 overflow-y-auto">
          {options.map((opt) => {
            const selected = isSelected(opt.value);
            return (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  onClick={() => onToggle(opt.value)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors ${
                    selected
                      ? "bg-navy text-white"
                      : "hover:bg-[var(--color-lime)]/30"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex shrink-0 w-3.5 h-3.5 items-center justify-center border-2 text-[9px] leading-none ${
                        selected
                          ? "border-white bg-white text-navy"
                          : "border-ink"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="text-xs truncate">{opt.label}</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] shrink-0 ${
                      selected ? "text-blue-200" : "text-ink-muted"
                    }`}
                  >
                    {opt.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
