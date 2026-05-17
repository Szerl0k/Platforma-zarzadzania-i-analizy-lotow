"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { Airport, AirlineWithDestinations } from "../api/airports";
import {
  EMPTY_GEOJSON,
  mapRoutesToGeoJson,
} from "@/app/telemetry/_utils/telemetryMapHelpers";

/**
 * Hook do zarządzania trasami wybranego lotniska.
 * Obsługuje wybór linii lotniczych i generowanie danych GeoJSON dla mapy.
 *
 * @calledBy TelemetryMapView
 */
export function useAirportRoutes(selectedAirport: Airport | null) {
  const [prevIcao, setPrevIcao] = useState<string | null>(
    selectedAirport?.icaoCode ?? null,
  );
  const [selectedRoutes, setSelectedRoutes] = useState<Map<string, Airport[]>>(
    new Map(),
  );

  const currentIcao = selectedAirport?.icaoCode ?? null;

  // Reset tras przy zmianie wybranego lotniska
  if (currentIcao !== prevIcao) {
    setPrevIcao(currentIcao);
    setSelectedRoutes(new Map());
  }

  const toggleAirline = useCallback(
    (airlineIcao: string, destinations: Airport[]) => {
      setSelectedRoutes((prev) => {
        const next = new Map(prev);
        if (next.has(airlineIcao)) {
          next.delete(airlineIcao);
        } else {
          next.set(airlineIcao, destinations);
        }
        return next;
      });
    },
    [],
  );

  const toggleAll = useCallback((allRoutes: AirlineWithDestinations[]) => {
    setSelectedRoutes((prev) => {
      const allSelected = allRoutes.every((r) => prev.has(r.airline.icaoCode));
      if (allSelected) return new Map();
      return new Map(
        allRoutes.map((r) => [r.airline.icaoCode, r.destinations]),
      );
    });
  }, []);

  const selectedAirlineIcaos = useMemo(
    () => new Set(selectedRoutes.keys()),
    [selectedRoutes],
  );

  const routesGeoJson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!selectedAirport || selectedRoutes.size === 0) return EMPTY_GEOJSON;

    // Unikalne lotniska docelowe ze wszystkich wybranych linii
    const allDestinations = [
      ...new Map(
        [...selectedRoutes.values()].flat().map((a) => [a.icaoCode, a]),
      ).values(),
    ];

    return mapRoutesToGeoJson(selectedAirport, allDestinations);
  }, [selectedAirport, selectedRoutes]);

  const clearRoutes = useCallback(() => {
    setSelectedRoutes(new Map());
  }, []);

  return {
    selectedRoutes,
    selectedAirlineIcaos,
    routesGeoJson,
    toggleAirline,
    toggleAll,
    clearRoutes,
  };
}
