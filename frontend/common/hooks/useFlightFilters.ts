"use client";

import { useCallback, useMemo, useState } from "react";
import type { FlightPositionDTO } from "../api/telemetry";
import {
  EMPTY_FLIGHT_FILTERS,
  FlightFilters,
  countActiveFilters,
  deriveFilterOptions,
  filterFlights,
} from "@/app/telemetry/_utils/flightFilters";

export function useFlightFilters(flights: FlightPositionDTO[]) {
  const [filters, setFilters] = useState<FlightFilters>(EMPTY_FLIGHT_FILTERS);

  const setFlightNumber = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, flightNumber: value }));
  }, []);

  const toggleAirline = useCallback((code: string) => {
    setFilters((prev) => {
      const next = new Set(prev.airlines);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return { ...prev, airlines: next };
    });
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setFilters((prev) => {
      const next = new Set(prev.countries);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return { ...prev, countries: next };
    });
  }, []);

  const toggleCategory = useCallback((category: number) => {
    setFilters((prev) => {
      const next = new Set(prev.categories);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return { ...prev, categories: next };
    });
  }, []);

  const clear = useCallback(() => setFilters(EMPTY_FLIGHT_FILTERS), []);

  const options = useMemo(() => deriveFilterOptions(flights), [flights]);
  const filtered = useMemo(
    () => filterFlights(flights, filters),
    [flights, filters],
  );
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  return {
    filters,
    setFlightNumber,
    toggleAirline,
    toggleCountry,
    toggleCategory,
    clear,
    options,
    filtered,
    activeCount,
    visibleCount: filtered.length,
    totalCount: flights.length,
  };
}
