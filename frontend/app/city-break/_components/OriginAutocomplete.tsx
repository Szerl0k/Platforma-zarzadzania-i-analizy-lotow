"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/common/components";
import { searchAirports, type Airport } from "@/common/api/airports";

interface OriginAutocompleteProps {
  value: Airport | null;
  onChange: (airport: Airport | null) => void;
  id?: string;
}

export function OriginAutocomplete({
  value,
  onChange,
  id = "origin",
}: OriginAutocompleteProps) {
  const [query, setQuery] = useState(formatLabel(value));
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(formatLabel(value));
  }, [value]);

  useEffect(() => {
    const term = query.trim();
    if (!term || term === formatLabel(value)) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await searchAirports(term, 10);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const showDropdown = useMemo(
    () => open && (loading || results.length > 0),
    [open, loading, results.length],
  );

  function handleSelect(airport: Airport) {
    onChange(airport);
    setQuery(formatLabel(airport));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        autoComplete="off"
        value={query}
        placeholder="np. Warszawa, EPWA, WAW"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
          setOpen(true);
        }}
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto bg-surface border-2 border-ink shadow-brut"
        >
          {loading && (
            <li className="px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
              Szukam…
            </li>
          )}
          {!loading &&
            results.map((airport) => (
              <li key={airport.icaoCode}>
                <button
                  type="button"
                  onClick={() => handleSelect(airport)}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--color-lime)] cursor-pointer border-b border-ink/10 last:border-b-0"
                >
                  <p className="text-sm text-ink">
                    {airport.name}{" "}
                    <span className="font-mono text-[11px] text-ink-subtle">
                      {airport.icaoCode}
                      {airport.iataCode ? ` / ${airport.iataCode}` : ""}
                    </span>
                  </p>
                  {airport.city && (
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
                      {airport.city.name}
                      {airport.city.countryName
                        ? ` · ${airport.city.countryName}`
                        : ""}
                    </p>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function formatLabel(airport: Airport | null): string {
  if (!airport) return "";
  return `${airport.name} (${airport.icaoCode}${
    airport.iataCode ? `/${airport.iataCode}` : ""
  })`;
}
