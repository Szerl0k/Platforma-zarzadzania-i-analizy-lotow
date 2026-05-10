"use client";

import { FormEvent, useState } from "react";
import {
  Button,
  FormField,
  Input,
} from "@/common/components";
import type { Airport } from "@/common/api/airports";
import type {
  CityBreakSearchParams,
  SortBy,
} from "@/common/api/cityBreak";
import { OriginAutocomplete } from "./OriginAutocomplete";

interface SearchFormProps {
  onSubmit: (params: CityBreakSearchParams) => void;
  loading: boolean;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "flightTime", label: "Czas lotu" },
  { value: "popularity", label: "Popularność" },
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [origin, setOrigin] = useState<Airport | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(() => todayPlus(7));
  const [dateTo, setDateTo] = useState<string>(() => todayPlus(14));
  const [maxFlightHours, setMaxFlightHours] = useState<string>("");
  const [maxDistanceKm, setMaxDistanceKm] = useState<string>("");
  const [excludedCsv, setExcludedCsv] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("flightTime");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!origin) {
      setError("Wybierz punkt startu z listy.");
      return;
    }
    if (!dateFrom || !dateTo) {
      setError("Podaj zakres dat.");
      return;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError("Data od musi być wcześniejsza niż data do.");
      return;
    }

    const excludedCountryCodes = excludedCsv
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c));

    onSubmit({
      origin: origin.icaoCode,
      dateFrom,
      dateTo,
      maxFlightHours: maxFlightHours ? Number(maxFlightHours) : undefined,
      maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
      excludeCountryCodes:
        excludedCountryCodes.length > 0 ? excludedCountryCodes : undefined,
      sortBy,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Punkt startu" htmlFor="origin">
        <OriginAutocomplete value={origin} onChange={setOrigin} />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Data od" htmlFor="dateFrom">
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </FormField>
        <FormField label="Data do" htmlFor="dateTo">
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Max czas lotu (godz.)"
          htmlFor="maxFlightHours"
          optional
        >
          <Input
            id="maxFlightHours"
            type="number"
            min={0}
            step="0.5"
            value={maxFlightHours}
            onChange={(e) => setMaxFlightHours(e.target.value)}
            placeholder="np. 4"
          />
        </FormField>
        <FormField label="Max odległość (km)" htmlFor="maxDistanceKm" optional>
          <Input
            id="maxDistanceKm"
            type="number"
            min={0}
            step={50}
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
            placeholder="np. 2000"
          />
        </FormField>
      </div>

      <FormField
        label="Wykluczone kraje (kody ISO-2)"
        htmlFor="excludedCsv"
        optional
        hint="Oddziel przecinkami, np. RU, BY"
      >
        <Input
          id="excludedCsv"
          type="text"
          value={excludedCsv}
          onChange={(e) => setExcludedCsv(e.target.value)}
          placeholder="RU, BY"
        />
      </FormField>

      <FormField label="Sortuj po" htmlFor="sortBy">
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="w-full h-11 px-3 font-sans text-sm text-ink bg-surface border-2 border-ink focus:outline-none cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormField>

      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
        Filtrowanie po cenie / budżecie zostanie dodane wraz z integracją API
        cenowego.
      </p>

      {error && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} variant="primary">
        Szukaj propozycji
      </Button>
    </form>
  );
}
