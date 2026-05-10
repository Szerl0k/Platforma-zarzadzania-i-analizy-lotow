"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrackedFlightDTO,
  FlightHistoryDTO,
  HistoryFilters,
  listMyTrackedFlights,
  listFlightHistory,
  getTrackedCount,
  confirmTracking,
  untrackFlight,
  deleteHistoryEntry,
} from "../api/tracking";

interface UseMyFlightsResult {
  flights: TrackedFlightDTO[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isTracked: (flightId: string) => boolean;
  trackedFlightIdFor: (flightId: string) => string | null;
}

export function useMyFlights(pollIntervalMs = 30_000): UseMyFlightsResult {
  const [flights, setFlights] = useState<TrackedFlightDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await listMyTrackedFlights();
      if (!mountedRef.current) return;
      setFlights(data);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Błąd pobierania lotów.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refresh, pollIntervalMs]);

  const isTracked = useCallback(
    (flightId: string) => flights.some((f) => f.flightId === flightId),
    [flights],
  );

  const trackedFlightIdFor = useCallback(
    (flightId: string) => flights.find((f) => f.flightId === flightId)?.id ?? null,
    [flights],
  );

  return { flights, loading, error, refresh, isTracked, trackedFlightIdFor };
}

export function useTrackedCount(pollIntervalMs = 30_000) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function fetchCount() {
      try {
        const c = await getTrackedCount();
        if (mounted) setCount(c);
      } catch {
        // noop — silent failure for badge
      }
    }
    fetchCount();
    const interval = setInterval(fetchCount, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return count;
}

export function useFlightHistory(filters: HistoryFilters) {
  const [items, setItems] = useState<FlightHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFlightHistory(filters);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd pobierania historii.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}

export async function trackFlight(
  flightId: string,
  source: "flight_number" | "map_click" = "flight_number",
) {
  return confirmTracking(flightId, source);
}

export async function stopTracking(trackedFlightId: string) {
  await untrackFlight(trackedFlightId);
}

export async function deleteFromHistory(id: string) {
  await deleteHistoryEntry(id);
}
