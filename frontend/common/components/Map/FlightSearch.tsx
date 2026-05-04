"use client";

import { useState } from "react";
import { flightApi } from "@/common/api/flights";
import { locateFlight } from "@/common/api/telemetry";
import { Input, Button, Spinner } from "@/common/components";

interface FlightSearchProps {
  onSelect: (feature: GeoJSON.Feature<GeoJSON.Point>) => void;
  onError: (error: string | null) => void;
}

export function FlightSearch({ onSelect, onError }: FlightSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;

    setLoading(true);
    onError(null);
    try {
      const flight = await flightApi.getFlightDetails(term);

      if (!flight.isLive || !flight.faFlightId) {
        throw new Error(`Lot ${term} nie jest obecnie w powietrzu.`);
      }

      const tel = await locateFlight({ faFlightId: flight.faFlightId });

      if (!tel.location || !tel.location.coordinates) {
        throw new Error(`Brak aktualnej pozycji dla lotu ${term}.`);
      }

      const feature: GeoJSON.Feature<GeoJSON.Point> = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            tel.location.coordinates[0],
            tel.location.coordinates[1],
          ],
        },
        properties: {
          icao24: tel.icao24,
        },
      };

      onSelect(feature);
      setQuery("");
    } catch (err: any) {
      onError(err.message || `Nie znaleziono lotu "${term}".`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          placeholder="Lot (np. LOT3801)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-surface/95 backdrop-blur-sm pr-10 border-2 border-ink shadow-brut font-mono uppercase placeholder:normal-case h-10 w-48 sm:w-64"
          disabled={loading}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}
      </div>
      <Button
        type="submit"
        className="shrink-0 border-2 border-ink shadow-brut bg-lime h-10 px-4"
        disabled={loading}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </Button>
    </form>
  );
}
