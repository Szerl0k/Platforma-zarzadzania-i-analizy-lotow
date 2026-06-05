"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MapRef } from "react-map-gl/maplibre";
import { useLocateFlight } from "@/common/hooks/useTelemetry";
import { useFlightDetailsById } from "@/common/hooks/useFlights";

interface DeeplinkActions {
  setSelectedFlight: (f: GeoJSON.Feature<GeoJSON.Point> | null) => void;
  setSelectedAirportData: (a: null) => void;
  setHighlightedIcao: (icao: null) => void;
}

/**
 * Consumes the `/telemetry?flightId=UUID` deeplink exactly once (after the map
 * has loaded): resolves the flight, selects it, flies the camera to it and
 * clears the query param. Extracted from TelemetryMapView to isolate routing.
 */
export function useTelemetryDeeplink(
  mapRef: RefObject<MapRef | null>,
  mapLoaded: boolean,
  actions: DeeplinkActions,
): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Capture once on mount; subsequent router.replace must not re-trigger it.
  const [initialFlightId] = useState<string | null>(() =>
    searchParams.get("flightId"),
  );
  const [consumed, setConsumed] = useState(false);

  const { data: deeplinkFlight } = useFlightDetailsById(
    consumed ? null : initialFlightId,
  );
  const deeplinkLocateParams = useMemo(
    () =>
      !consumed && deeplinkFlight?.faFlightId
        ? { faFlightId: deeplinkFlight.faFlightId }
        : null,
    [consumed, deeplinkFlight],
  );
  const { data: deeplinkLocate } = useLocateFlight(deeplinkLocateParams);

  const { setSelectedFlight, setSelectedAirportData, setHighlightedIcao } =
    actions;

  useEffect(() => {
    if (consumed || !deeplinkLocate || !deeplinkFlight || !mapLoaded) return;
    const [lon, lat] = deeplinkLocate.location.coordinates as [number, number];
    setSelectedFlight({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        icao24: deeplinkLocate.icao24,
        callsign: deeplinkFlight.callsign,
        altitude: null,
        velocity: null,
        heading: null,
        onGround: false,
      },
    });
    setSelectedAirportData(null);
    setHighlightedIcao(null);
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 7, duration: 1200 });
    setConsumed(true);
    router.replace("/telemetry");
  }, [
    consumed,
    deeplinkLocate,
    deeplinkFlight,
    mapLoaded,
    router,
    mapRef,
    setSelectedFlight,
    setSelectedAirportData,
    setHighlightedIcao,
  ]);
}
