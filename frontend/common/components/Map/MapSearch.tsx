"use client";

import { useEffect, useRef, useState } from "react";
import { searchAirports, type Airport } from "@/common/api/airports";
import { Spinner } from "@/common/components";

interface MapSearchProps {
  onSelect: (airport: Airport, results: Airport[]) => void;
}

export function MapSearch({ onSelect }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setOpen(false);
      return;
    }

    setOpen(false);

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAirports(term);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(airport: Airport) {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(airport, results);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <svg
          className="w-3 h-3 text-ink-muted shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="EPWA, WAW, Warsaw…"
          className="bg-transparent font-mono text-xs uppercase tracking-widest text-ink placeholder:normal-case placeholder:tracking-normal outline-none w-44"
        />
        {loading && <Spinner size="sm" />}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 mt-1 w-72 bg-surface border-2 border-ink shadow-brut z-50 max-h-64 overflow-y-auto divide-y divide-border-subtle">
          {results.map((airport) => (
            <li key={airport.icaoCode}>
              <button
                onClick={() => handleSelect(airport)}
                className="w-full text-left px-3 py-2 hover:bg-navy hover:text-white transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {airport.name}
                  </span>
                  <span className="font-mono text-[10px] shrink-0 text-ink-muted">
                    {airport.icaoCode}
                    {airport.iataCode && ` / ${airport.iataCode}`}
                  </span>
                </div>
                {airport.city && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    {airport.city.name}
                    {airport.city.countryName &&
                      `, ${airport.city.countryName}`}
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
