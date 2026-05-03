import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  getFlightsInArea,
  BoundingBoxDTO,
  FlightPositionDTO,
  locateFlight,
  LocateFlightParams,
  LocateFlightResponseDTO,
} from "../api/telemetry";

interface UseTelemetryResult {
  flights: FlightPositionDTO[];
  error: string | null;
  loading: boolean;
  setBounds: (bounds: BoundingBoxDTO) => void;
}

export function useTelemetry(pollingIntervalMs = 10000): UseTelemetryResult {
  const [flights, setFlights] = useState<FlightPositionDTO[]>([]);
  const [bounds, setBounds] = useState<BoundingBoxDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleSetBounds = useCallback((newBounds: BoundingBoxDTO) => {
    setBounds((prev) => {
      if (
        prev &&
        prev.lomin === newBounds.lomin &&
        prev.lamin === newBounds.lamin &&
        prev.lomax === newBounds.lomax &&
        prev.lamax === newBounds.lamax
      ) {
        return prev; // Zwrócenie tej samej referencji zapobiega uruchomieniu useEffect
      }
      return newBounds;
    });
  }, []);

  const fetchFlights = useCallback(async (currentBounds: BoundingBoxDTO) => {
    try {
      const data = await getFlightsInArea(currentBounds);
      setFlights(data);
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ??
            "Wystąpił błąd podczas pobierania telemetrii.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Wystąpił nieznany błąd systemu.");
      }
      // Wyczyszczenie klastra, jeśli np. bounding box był zbyt duży (błąd limitu na serwerze)
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!bounds) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchFlights(bounds);

    const interval = setInterval(() => fetchFlights(bounds), pollingIntervalMs);

    return () => clearInterval(interval);
  }, [bounds, fetchFlights, pollingIntervalMs]);

  return { flights, error, loading, setBounds: handleSetBounds };
}

export function useLocateFlight(params: LocateFlightParams | null) {
  const [data, setData] = useState<LocateFlightResponseDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocate = useCallback(async (currentParams: LocateFlightParams) => {
    setLoading(true);
    try {
      const result = await locateFlight(currentParams);
      setData(result);
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? "Błąd lokalizacji lotu.");
      } else {
        setError("Wystąpił nieznany błąd.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params && (params.faFlightId || params.icao24)) {
      fetchLocate(params);
    } else {
      setData(null);
    }
  }, [params, fetchLocate]);

  return { data, loading, error };
}
