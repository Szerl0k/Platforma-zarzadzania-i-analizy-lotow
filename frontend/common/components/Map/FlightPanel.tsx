"use client";

import {
  Spinner,
  Alert,
  TrackThisFlightButton,
  Button,
} from "@/common/components";
import { useFlightDetailsById, useFlightPath } from "@/common/hooks/useFlights";
import { useLocateFlight } from "@/common/hooks/useTelemetry";
import { useAuth } from "@/common/hooks/useAuth";
import { useMemo, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  calculateFlightDuration,
  formatDuration,
  calculateMinutesBetween,
  calculateTimeRemaining,
} from "@/common/utils/flightUtils";
import { getDirectionShort } from "@/common/utils/geoUtils";
import { Map, Source, Layer, MapRef } from "react-map-gl/maplibre";
import { useThemeColors } from "@/common/hooks/UseThemeColors";
import "maplibre-gl/dist/maplibre-gl.css";

function FlightPreviewMap({
  flightId,
  isLive,
  telemetry,
}: {
  flightId: string;
  isLive: boolean;
  telemetry: any;
}) {
  const { pathData, isLoading } = useFlightPath(flightId);
  const { navy, lime, ink } = useThemeColors();
  const mapRef = useRef<MapRef>(null);

  const traveledPathGeoJson = useMemo(
    () =>
      pathData?.traveled
        ? {
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                geometry: pathData.traveled as any,
                properties: {},
              },
            ],
          }
        : null,
    [pathData],
  );

  const remainingPathGeoJson = useMemo(
    () =>
      pathData?.remaining
        ? {
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                geometry: pathData.remaining as any,
                properties: {},
              },
            ],
          }
        : null,
    [pathData],
  );

  const positionGeoJson = useMemo(
    () =>
      telemetry?.location
        ? {
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                geometry: telemetry.location,
                properties: {},
              },
            ],
          }
        : null,
    [telemetry],
  );

  useEffect(() => {
    if (!mapRef.current || !pathData) return;

    const coords: number[][] = [];
    if (pathData.traveled?.coordinates) {
      const g = pathData.traveled as any;
      if (Array.isArray(g.coordinates)) coords.push(...g.coordinates);
    }
    if (pathData.remaining?.coordinates) {
      const g = pathData.remaining as any;
      if (Array.isArray(g.coordinates)) coords.push(...g.coordinates);
    }

    if (coords.length > 0) {
      const minLng = Math.min(...coords.map((c) => c[0]));
      const maxLng = Math.max(...coords.map((c) => c[0]));
      const minLat = Math.min(...coords.map((c) => c[1]));
      const maxLat = Math.max(...coords.map((c) => c[1]));

      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 20, duration: 1000 },
      );
    }
  }, [pathData]);

  if (isLoading)
    return (
      <div className="h-32 w-full bg-ink/5 flex items-center justify-center border-y-2 border-ink">
        <Spinner size="sm" />
      </div>
    );

  return (
    <div className="h-80 w-full border-y-2 border-ink relative overflow-hidden bg-ink/5">
      <Map
        ref={mapRef}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        initialViewState={{ longitude: 19.0, latitude: 52.0, zoom: 3 }}
        attributionControl={false}
      >
        {traveledPathGeoJson && (
          <Source id="traveled" type="geojson" data={traveledPathGeoJson}>
            <Layer
              id="traveled-line"
              type="line"
              paint={{ "line-color": navy, "line-width": 3 }}
            />
          </Source>
        )}
        {remainingPathGeoJson && (
          <Source id="remaining" type="geojson" data={remainingPathGeoJson}>
            <Layer
              id="remaining-line"
              type="line"
              paint={{
                "line-color": navy,
                "line-width": 3,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}
        {isLive && positionGeoJson && (
          <Source id="position" type="geojson" data={positionGeoJson}>
            <Layer
              id="position-point"
              type="circle"
              paint={{
                "circle-radius": 5,
                "circle-color": lime,
                "circle-stroke-color": ink,
                "circle-stroke-width": 2,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}

interface FlightPanelProps {
  initialFlightId?: string;
  properties?: {
    icao24?: string;
    callsign?: string;
    altitude?: number | null;
    velocity?: number | null;
    heading?: number | null;
    onGround?: boolean;
  };
  onClose: () => void;
  showPreviewMap?: boolean;
  onLocate?: (coords: [number, number]) => void;
  hideTrackingButton?: boolean;
}

export function FlightPanel({
  initialFlightId,
  properties,
  onClose,
  showPreviewMap = false,
  onLocate,
  hideTrackingButton = false,
}: FlightPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. First, attempt to fetch flight details if we have an initial ID (e.g. from Search)
  const {
    data: initialFlightDetails,
    isLoading: isInitialLoading,
    error: initialError,
  } = useFlightDetailsById(initialFlightId || null);

  // 2. Determine how to locate the flight for telemetry (OpenSky/PostGIS)
  const locateParams = useMemo(() => {
    const icao24 = properties?.icao24;
    const faFlightId = initialFlightDetails?.faFlightId;

    if (icao24) return { icao24 };
    if (faFlightId) return { faFlightId };
    return null;
  }, [properties?.icao24, initialFlightDetails?.faFlightId]);

  const {
    data: detailedTelemetry,
    loading: isLocating,
    error: telError,
  } = useLocateFlight(locateParams);

  // 3. Final flight details: either from initial ID or discovered via telemetry's internal ID
  const {
    data: flightDetails,
    isLoading: isFlightLoading,
    error: flightError,
  } = useFlightDetailsById(
    initialFlightId || detailedTelemetry?.internalFlightId || null,
  );

  const metrics = useMemo(() => {
    if (!flightDetails) return null;

    const currentDuration = calculateFlightDuration(
      {
        actual: flightDetails.actualOut,
        estimated: flightDetails.estimatedOut,
        scheduled: flightDetails.scheduledOut,
      },
      {
        actual: flightDetails.actualIn,
        estimated: flightDetails.estimatedIn,
        scheduled: flightDetails.scheduledIn,
      },
    );

    const plannedDuration = calculateMinutesBetween(
      flightDetails.scheduledOut,
      flightDetails.scheduledIn,
    );

    const estimatedDuration = calculateMinutesBetween(
      flightDetails.estimatedOut || flightDetails.scheduledOut,
      flightDetails.estimatedIn || flightDetails.scheduledIn,
    );

    const timeLeft = calculateTimeRemaining(
      flightDetails.estimatedIn || flightDetails.scheduledIn,
    );

    return {
      currentDuration,
      plannedDuration,
      estimatedDuration,
      timeLeft,
    };
  }, [flightDetails, now]);

  return (
    <div className="h-full flex flex-col overflow-hidden w-full bg-surface border-x-2 border-ink">
      {/* Header */}
      <div className="p-3 border-b-2 border-ink shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
              Szczegóły lotu
            </p>
            <p className="font-mono font-bold text-base uppercase tracking-widest text-ink truncate">
              {properties?.callsign ||
                flightDetails?.callsign ||
                "Ładowanie..."}
            </p>
            <p className="text-xs text-ink-muted font-mono mt-0.5">
              ICAO24:{" "}
              {properties?.icao24 || detailedTelemetry?.icao24 || "Brak"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-white transition-colors text-base font-bold"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Track & Locate actions */}
      {flightDetails && (
        <div className="p-3 border-b-2 border-ink shrink-0 flex flex-wrap gap-2">
          {user && !hideTrackingButton && (
            <TrackThisFlightButton
              flightId={flightDetails.id}
              source="map_click"
            />
          )}
          {flightDetails.isLive && (
            <Button
              variant="primary"
              onClick={() => {
                if (onLocate && detailedTelemetry?.location) {
                  const [lon, lat] = detailedTelemetry.location.coordinates as [
                    number,
                    number,
                  ];
                  onLocate([lon, lat]);
                } else {
                  router.push(`/telemetry?flightId=${flightDetails.id}`);
                }
              }}
              className="flex-1 min-w-[140px]"
            >
              Pokaż na mapie
            </Button>
          )}
        </div>
      )}

      {/* Visual Timeline */}
      {flightDetails && (
        <div className="p-4 bg-ink/5 border-b border-ink/10 shrink-0">
          <div className="flex items-center justify-between gap-2 mx-auto">
            {/* Origin */}
            <div className="flex flex-col items-center gap-1 min-w-[70px]">
              <p className="text-sm font-mono text-ink-muted truncate max-w-[90px] leading-none mb-1 font-medium text-center">
                {flightDetails.origin?.city?.name || "???"}
              </p>
              <img
                src="/airport.png"
                alt="Airport"
                className="w-8 h-8 object-contain grayscale opacity-80"
              />
              <div className="text-center mt-1">
                <p className="font-bold text-sm leading-none">
                  {flightDetails.origin?.iataCode || "???"}
                </p>
                <p className="text-xs font-mono text-ink-muted uppercase">
                  {flightDetails.origin?.icaoCode || "????"}
                </p>
              </div>
            </div>

            {/* Path */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-center justify-center">
                <div className="flex-1 h-[2px] opacity-20 bg-dotted-path"></div>
                <div className="mx-3 rotate-90 shrink-0">
                  <img
                    src="/airplane.png"
                    alt="Plane"
                    className="w-7 h-7 object-contain grayscale opacity-80"
                  />
                </div>
                <div className="flex-1 h-[2px] opacity-20 bg-dotted-path"></div>
              </div>
              <p className="font-mono text-xs font-bold text-ink-muted">
                ~{formatDuration(metrics?.currentDuration || null)}
              </p>
            </div>

            {/* Destination */}
            <div className="flex flex-col items-center gap-1 min-w-[70px]">
              <p className="text-sm font-mono text-ink-muted truncate max-w-[90px] leading-none mb-1 font-medium text-center">
                {flightDetails.destination?.city?.name || "???"}
              </p>
              <img
                src="/airport.png"
                alt="Airport"
                className="w-8 h-8 object-contain grayscale opacity-80"
              />
              <div className="text-center mt-1">
                <p className="font-bold text-sm leading-none">
                  {flightDetails.destination?.iataCode || "???"}
                </p>
                <p className="text-xs font-mono text-ink-muted uppercase">
                  {flightDetails.destination?.icaoCode || "????"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Map integration */}
      {showPreviewMap && flightDetails && (
        <FlightPreviewMap
          flightId={flightDetails.id}
          isLive={flightDetails.isLive}
          telemetry={detailedTelemetry}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-8">
        {/* OpenSky & PostGIS Telemetry Data */}
        <section>
          <div className="flex items-center justify-between mb-3 pb-1 border-b border-border-subtle">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
              Dane Telemetryczne
            </p>
            {isLocating && <Spinner size="sm" />}
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm break-words">
            <span className="text-ink-muted text-sm flex items-center">
              Wysokość:
            </span>
            <span className="font-mono font-medium text-base">
              {properties?.altitude != null
                ? `${Math.round(properties.altitude)} m`
                : detailedTelemetry?.altitude != null
                  ? `${Math.round(detailedTelemetry.altitude)} m`
                  : "Brak"}
            </span>

            <span className="text-ink-muted text-sm flex items-center">
              Prędkość:
            </span>
            <span className="font-mono font-medium text-base">
              {properties?.velocity != null
                ? `${Math.round(properties.velocity)} m/s`
                : detailedTelemetry?.velocity != null
                  ? `${Math.round(detailedTelemetry.velocity)} m/s`
                  : "Brak"}
            </span>

            <span className="text-ink-muted text-sm flex items-center">
              Kierunek:
            </span>
            <span className="font-mono font-medium text-base">
              {properties?.heading != null
                ? `${Math.round(properties.heading)}° | ${getDirectionShort(properties.heading)}`
                : detailedTelemetry?.heading != null
                  ? `${Math.round(detailedTelemetry.heading)}° | ${getDirectionShort(detailedTelemetry.heading)}`
                  : "Brak"}
            </span>

            <span className="text-ink-muted text-sm flex items-center">
              Status ADS-B:
            </span>
            <span className="font-mono font-medium text-base">
              {(properties?.onGround ?? detailedTelemetry?.onGround)
                ? "Na ziemi"
                : flightDetails?.isLive
                  ? "W locie"
                  : "Na ziemi"}
            </span>

            {/* PostGIS distances */}
            {detailedTelemetry?.distanceFromOriginKm != null && (
              <>
                <span className="text-ink-muted text-sm border-t border-ink/5 pt-2 mt-1 flex items-center">
                  Odległość od wylotu:
                </span>
                <span className="font-mono text-success font-bold border-t border-ink/5 pt-2 mt-1 text-base">
                  {Math.round(detailedTelemetry.distanceFromOriginKm)} km
                </span>
              </>
            )}

            {detailedTelemetry?.distanceToDestinationKm != null && (
              <>
                <span className="text-ink-muted text-sm flex items-center">
                  Do celu:
                </span>
                <span className="font-mono text-success font-bold text-base">
                  {Math.round(detailedTelemetry.distanceToDestinationKm)} km
                </span>
              </>
            )}
          </div>

          {telError && (
            <Alert variant="info" className="mt-4 text-xs">
              Brak aktywnego transpondera OpenSky.
            </Alert>
          )}
        </section>

        {/* AeroAPI Commercial Data */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted mb-3 pb-1 border-b border-border-subtle">
            Dane Komercyjne
          </p>

          {isFlightLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-muted">
              <Spinner size="sm" />
              <p className="font-mono text-sm uppercase tracking-widest animate-pulse">
                Pobieranie danych
              </p>
            </div>
          )}

          {flightError !== null && (
            <Alert variant="error">Nie udało się pobrać szczegółów lotu.</Alert>
          )}

          {!isFlightLoading && flightError === null && flightDetails && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 text-sm break-words">
                {/* Identifiers */}
                <span className="text-ink-muted text-sm flex items-center">
                  Identyfikator ICAO:
                </span>
                <span className="font-medium text-base">
                  {flightDetails.identIcao}
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Identyfikator IATA:
                </span>
                <span className="font-medium text-base">
                  {flightDetails.identIata || "Brak"}
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Callsign:
                </span>
                <span className="font-medium text-base">
                  {flightDetails.callsign}
                </span>

                {/* Airline */}
                <span className="text-ink-muted text-sm flex items-center">
                  Linia lotnicza:
                </span>
                <span className="font-medium text-base">
                  {flightDetails.operatingAirline?.name || "Brak"}
                  {flightDetails.operatingAirline?.icaoCode &&
                    ` (${flightDetails.operatingAirline.icaoCode})`}
                </span>

                {/* Origin */}
                <span className="text-ink-muted text-sm mt-2 flex items-start pt-1">
                  Wylot:
                </span>
                <span className="mt-2">
                  <span className="font-medium block text-base">
                    {flightDetails.origin?.name ||
                      flightDetails.origin?.icaoCode ||
                      "N/A"}
                  </span>
                  <span className="text-xs font-mono text-ink-muted block uppercase">
                    {flightDetails.origin?.city?.name}
                    {flightDetails.origin?.city?.countryName
                      ? `, ${flightDetails.origin.city.countryName}`
                      : ""}
                  </span>
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Terminal/Bramka (Wylot):
                </span>
                <span className="font-medium text-base">
                  {flightDetails.terminalOrigin
                    ? `T${flightDetails.terminalOrigin}`
                    : "-"}
                  {" / "}
                  {flightDetails.gateOrigin
                    ? `G${flightDetails.gateOrigin}`
                    : "-"}
                </span>

                {/* Destination */}
                <span className="text-ink-muted text-sm mt-2 flex items-start pt-1">
                  Przylot:
                </span>
                <span className="mt-2">
                  <span className="font-medium block text-base">
                    {flightDetails.destination?.name ||
                      flightDetails.destination?.icaoCode ||
                      "N/A"}
                  </span>
                  <span className="text-xs font-mono text-ink-muted block uppercase">
                    {flightDetails.destination?.city?.name}
                    {flightDetails.destination?.city?.countryName
                      ? `, ${flightDetails.destination.city.countryName}`
                      : ""}
                  </span>
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Terminal/Bramka (Przylot):
                </span>
                <span className="font-medium text-base">
                  {flightDetails.terminalDestination
                    ? `T${flightDetails.terminalDestination}`
                    : "-"}
                  {" / "}
                  {flightDetails.gateDestination
                    ? `G${flightDetails.gateDestination}`
                    : "-"}
                </span>

                {/* Status */}
                <span className="text-ink-muted text-sm mt-2 flex items-center pt-1">
                  Status lotu:
                </span>
                <span className="font-medium mt-2 text-base">
                  {flightDetails.status?.name || "Brak"}
                </span>

                {/* Duration Metrics */}
                <span className="text-ink-muted text-sm flex items-center border-t border-ink/5 pt-2 mt-2">
                  Czas lotu (Priorytetowy):
                </span>
                <span className="font-mono font-bold text-base border-t border-ink/5 pt-2 mt-2">
                  {formatDuration(metrics?.currentDuration || null)}
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Czas lotu (Planowany):
                </span>
                <span className="font-mono text-base">
                  {formatDuration(metrics?.plannedDuration || null)}
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Czas lotu (Estymowany):
                </span>
                <span className="font-mono text-base">
                  {formatDuration(metrics?.estimatedDuration || null)}
                </span>

                <span className="text-ink-muted text-sm flex items-center">
                  Pozostało czasu:
                </span>
                <span
                  className={`font-mono font-bold text-base ${(metrics?.timeLeft ?? 0) < 0 ? "text-danger" : "text-navy"}`}
                >
                  {formatDuration(metrics?.timeLeft || null)}
                </span>
              </div>

              {/* Delays */}
              {flightDetails.departureDelay || flightDetails.arrivalDelay ? (
                <div className="p-4 bg-ink/5 border border-ink/10 rounded-sm">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3 text-ink-muted">
                    Opóźnienia
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm font-mono break-words">
                    {flightDetails.departureDelay ? (
                      <>
                        <span className="text-ink-muted text-sm flex items-center">
                          Wylot:
                        </span>
                        <span className="text-danger font-bold text-base">
                          {Math.round(flightDetails.departureDelay / 60)} min
                        </span>
                      </>
                    ) : null}
                    {flightDetails.arrivalDelay ? (
                      <>
                        <span className="text-ink-muted text-sm flex items-center">
                          Przylot:
                        </span>
                        <span className="text-danger font-bold text-base">
                          {Math.round(flightDetails.arrivalDelay / 60)} min
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Times */}
              <div className="mt-2 border-t border-border-subtle pt-4">
                <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3 text-ink-muted">
                  Czasy (Lokalne użytkownika)
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm font-mono break-words">
                  <span className="text-ink-muted text-sm flex items-center">
                    Planowany wylot:
                  </span>
                  <span className="font-medium text-sm">
                    {flightDetails.scheduledOut
                      ? new Date(flightDetails.scheduledOut).toLocaleString(
                          "pl-PL",
                        )
                      : "-"}
                  </span>

                  <span className="text-ink-muted text-sm flex items-center">
                    Przybliżony wylot:
                  </span>
                  <span className="font-medium text-sm">
                    {flightDetails.estimatedOut
                      ? new Date(flightDetails.estimatedOut).toLocaleString(
                          "pl-PL",
                        )
                      : "-"}
                  </span>

                  <span className="text-ink-muted text-sm flex items-center">
                    Rzeczywisty wylot:
                  </span>
                  <span className="font-medium text-sm">
                    {flightDetails.actualOut
                      ? new Date(flightDetails.actualOut).toLocaleString(
                          "pl-PL",
                        )
                      : "-"}
                  </span>

                  <span className="text-ink-muted text-sm mt-2 border-t border-ink/10 pt-3 flex items-center">
                    Planowany przylot:
                  </span>
                  <span className="mt-2 border-t border-ink/10 pt-3 font-medium text-sm">
                    {flightDetails.scheduledIn
                      ? new Date(flightDetails.scheduledIn).toLocaleString(
                          "pl-PL",
                        )
                      : "-"}
                  </span>

                  <span className="text-ink-muted text-sm flex items-center">
                    Przybliżony przylot:
                  </span>
                  <span className="font-medium text-sm">
                    {flightDetails.estimatedIn
                      ? new Date(flightDetails.estimatedIn).toLocaleString(
                          "pl-PL",
                        )
                      : "-"}
                  </span>

                  <span className="text-ink-muted text-sm flex items-center">
                    Rzeczywisty przylot:
                  </span>
                  <span className="font-medium text-sm">
                    {flightDetails.actualIn
                      ? new Date(flightDetails.actualIn).toLocaleString("pl-PL")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isFlightLoading && flightError === null && !flightDetails && (
            <p className="text-sm text-ink-muted italic py-4 break-words">
              Brak dodatkowych informacji komercyjnych dla tego lotu.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
