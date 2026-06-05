"use client";

import { useEffect, useMemo, useState } from "react";
import { useFlightDetailsById } from "@/common/hooks/useFlights";
import { useLocateFlight } from "@/common/hooks/useTelemetry";
import { useAuth } from "@/common/hooks/useAuth";
import { FlightDetailsResponse } from "@/common/api/flights";
import { LocateFlightResponseDTO } from "@/common/api/telemetry";
import { computeFlightMetrics, FlightMetrics } from "./flightMetrics";

export interface FlightPanelDataInput {
  initialFlightId?: string;
  icao24?: string;
}

export interface FlightPanelData {
  detailedTelemetry: LocateFlightResponseDTO | null;
  isLocating: boolean;
  telemetryError: string | null;
  flightDetails: FlightDetailsResponse | null;
  isFlightLoading: boolean;
  flightError: unknown;
  metrics: FlightMetrics | null;
  isAuthenticated: boolean;
}

/**
 * Owns every data concern of the FlightPanel: the initial details lookup (search
 * deeplink), the live telemetry locate (by ICAO24 or faFlightId), the final
 * commercial details fetch, the per-minute "time left" tick and derived metrics,
 * plus the auth flag. The component itself stays presentational.
 */
export function useFlightPanelData({
  initialFlightId,
  icao24,
}: FlightPanelDataInput): FlightPanelData {
  const { user } = useAuth();

  // Re-render once a minute so the "time left" metric stays fresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. If we arrived with a flight id (e.g. from search), fetch its details to
  //    discover the faFlightId used to locate live telemetry.
  const { data: initialFlightDetails } = useFlightDetailsById(
    initialFlightId || null,
  );

  // 2. Locate live telemetry — prefer ICAO24 (map click), else faFlightId.
  const faFlightId = initialFlightDetails?.faFlightId;
  const locateParams = useMemo(() => {
    if (icao24) return { icao24 };
    if (faFlightId) return { faFlightId };
    return null;
  }, [icao24, faFlightId]);

  const {
    data: detailedTelemetry,
    loading: isLocating,
    error: telemetryError,
  } = useLocateFlight(locateParams);

  // 3. Final commercial details: from the initial id, or discovered via telemetry.
  const {
    data: flightDetails,
    isLoading: isFlightLoading,
    error: flightError,
  } = useFlightDetailsById(
    initialFlightId || detailedTelemetry?.internalFlightId || null,
  );

  const metrics = useMemo(
    () => computeFlightMetrics(flightDetails),
    // `now` intentionally included so the countdown recomputes each minute.
    [flightDetails, now],
  );

  return {
    detailedTelemetry,
    isLocating,
    telemetryError,
    flightDetails,
    isFlightLoading,
    flightError,
    metrics,
    isAuthenticated: !!user,
  };
}
