"use client";

import { Spinner, Alert } from "@/common/components";
import { useFlightDetails } from "@/common/hooks/useFlights";
import { useLocateFlight } from "@/common/hooks/useTelemetry";
import { useMemo } from "react";

interface FlightPanelProps {
  properties: {
    icao24: string;
    callsign?: string;
    altitude?: number | null;
    velocity?: number | null;
    heading?: number | null;
    onGround?: boolean;
  };
  onClose: () => void;
}

export function FlightPanel({ properties, onClose }: FlightPanelProps) {
  // Detailed telemetry fetch using ICAO24 (map click)
  const locateParams = useMemo(() => ({ icao24: properties.icao24 }), [properties.icao24]);
  const { data: detailedTelemetry, loading: isLocating } = useLocateFlight(locateParams);

  // Identifier precedence:
  // 1. Callsign from map properties
  // 2. faFlightId from detailed telemetry (if resolved by backend)
  // 3. ICAO24 as fallback
  const icaoCode = properties.callsign 
    ? properties.callsign.trim() 
    : (detailedTelemetry?.faFlightId || properties.icao24);

  const { 
    data: flightDetails, 
    isLoading: isFlightLoading, 
    error: flightError 
  } = useFlightDetails(icaoCode);

  return (
    <div className="h-full flex flex-col overflow-hidden w-full">
      {/* Header */}
      <div className="p-3 border-b-2 border-ink shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Szczegóły lotu
            </p>
            <p className="font-mono font-bold text-sm uppercase tracking-widest text-ink truncate">
              {properties.callsign || detailedTelemetry?.faFlightId || "Brak callsign"}
            </p>
            <p className="text-xs text-ink-muted font-mono mt-0.5">
              ICAO24: {properties.icao24}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-white transition-colors text-sm font-bold"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">

        {/* OpenSky & PostGIS Telemetry Data */}
        <section>
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-border-subtle">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Dane Telemetryczne
            </p>
            {isLocating && <Spinner size="sm" />}
          </div>
          
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm break-words">
            <span className="text-ink-muted">Wysokość:</span>
            <span className="font-mono">
              {properties.altitude != null ? `${Math.round(properties.altitude)} m` : "Brak"}
            </span>

            <span className="text-ink-muted">Prędkość:</span>
            <span className="font-mono">
              {properties.velocity != null ? `${Math.round(properties.velocity)} m/s` : "Brak"}
            </span>

            <span className="text-ink-muted">Kierunek:</span>
            <span className="font-mono">
              {properties.heading != null ? `${Math.round(properties.heading)}°` : "Brak"}
            </span>

            <span className="text-ink-muted">Status ADS-B:</span>
            <span className="font-mono">
              {properties.onGround ? "Na ziemi" : "W locie"}
            </span>

            {/* PostGIS distances */}
            {detailedTelemetry?.distanceFromOriginKm != null && (
              <>
                <span className="text-ink-muted border-t border-ink/5 pt-1 mt-1">Odległość od wylotu:</span>
                <span className="font-mono text-lime-600 font-bold border-t border-ink/5 pt-1 mt-1">
                  {Math.round(detailedTelemetry.distanceFromOriginKm)} km
                </span>
              </>
            )}

            {detailedTelemetry?.distanceToDestinationKm != null && (
              <>
                <span className="text-ink-muted">Do celu:</span>
                <span className="font-mono text-lime-600 font-bold">
                  {Math.round(detailedTelemetry.distanceToDestinationKm)} km
                </span>
              </>
            )}
          </div>
        </section>

        {/* AeroAPI Commercial Data */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2 pb-1 border-b border-border-subtle">
            Dane Komercyjne
          </p>

          {isFlightLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-muted">
              <Spinner size="sm" />
              <p className="font-mono text-xs uppercase tracking-widest animate-pulse">
                Pobieranie danych
              </p>
            </div>
          )}

          {flightError !== null && (
             <Alert variant="error">Nie udało się pobrać szczegółów lotu.</Alert>
          )}

          {!isFlightLoading && flightError === null && flightDetails && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm break-words">
                  {/* Identifiers */}
                  <span className="text-ink-muted break-words">Identyfikator ICAO:</span>
                  <span className="font-medium break-words">{flightDetails.identIcao}</span>

                  <span className="text-ink-muted break-words">Identyfikator IATA:</span>
                  <span className="font-medium break-words">{flightDetails.identIata || "Brak"}</span>

                  <span className="text-ink-muted break-words">Identyfikator FA:</span>
                  <span className="font-medium break-words">{flightDetails.faFlightId || "Brak"}</span>

                  <span className="text-ink-muted break-words">Callsign:</span>
                  <span className="font-medium break-words">{flightDetails.callsign}</span>

                  {/* Airline */}
                  <span className="text-ink-muted break-words">Linia lotnicza:</span>
                  <span className="font-medium break-words">
                      {flightDetails.operatingAirline?.name || "Brak"}
                      {flightDetails.operatingAirline?.icaoCode && ` (${flightDetails.operatingAirline.icaoCode})`}
                  </span>

                  {/* Origin */}
                  <span className="text-ink-muted break-words mt-2">Wylot:</span>
                  <span className="mt-2">
                      <span className="font-medium break-words block">{flightDetails.origin?.name || flightDetails.origin?.icaoCode || "N/A"}</span>
                      <span className="text-[10px] text-ink-muted block break-words">
                         {flightDetails.origin?.city?.name}{flightDetails.origin?.city?.countryName ? `, ${flightDetails.origin.city.countryName}` : ''}
                      </span>
                  </span>

                  <span className="text-ink-muted break-words">Terminal/Bramka (Wylot):</span>
                  <span className="break-words">
                    {flightDetails.terminalOrigin ? `T${flightDetails.terminalOrigin}` : "-"}
                    {" / "}
                    {flightDetails.gateOrigin ? `G${flightDetails.gateOrigin}` : "-"}
                  </span>

                  {/* Destination */}
                  <span className="text-ink-muted break-words mt-2">Przylot:</span>
                  <span className="mt-2">
                      <span className="font-medium break-words block">{flightDetails.destination?.name || flightDetails.destination?.icaoCode || "N/A"}</span>
                      <span className="text-[10px] text-ink-muted block break-words">
                         {flightDetails.destination?.city?.name}{flightDetails.destination?.city?.countryName ? `, ${flightDetails.destination.city.countryName}` : ''}
                      </span>
                  </span>

                  <span className="text-ink-muted break-words">Terminal/Bramka (Przylot):</span>
                  <span className="break-words">
                    {flightDetails.terminalDestination ? `T${flightDetails.terminalDestination}` : "-"}
                    {" / "}
                    {flightDetails.gateDestination ? `G${flightDetails.gateDestination}` : "-"}
                  </span>

                  {/* Status */}
                  <span className="text-ink-muted break-words mt-2">Status lotu:</span>
                  <span className="font-medium break-words mt-2">{flightDetails.status?.name || "Brak"}</span>
              </div>

              {/* Delays */}
              {(flightDetails.departureDelay || flightDetails.arrivalDelay) ? (
                  <div className="p-3 bg-ink/5 border border-ink/10 rounded-sm">
                      <p className="text-xs uppercase tracking-widest font-bold mb-2">Opóźnienia</p>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-mono break-words">
                          {flightDetails.departureDelay ? (
                              <>
                                  <span className="text-ink-muted">Wylot:</span>
                                  <span className="text-red-600 font-bold">{Math.round(flightDetails.departureDelay / 60)} min</span>
                              </>
                          ) : null}
                          {flightDetails.arrivalDelay ? (
                              <>
                                  <span className="text-ink-muted">Przylot:</span>
                                  <span className="text-red-600 font-bold">{Math.round(flightDetails.arrivalDelay / 60)} min</span>
                              </>
                          ) : null}
                      </div>
                  </div>
              ) : null}

              {/* Times */}
              <div className="mt-2 border-t border-border-subtle pt-3">
                 <p className="text-xs uppercase tracking-widest font-bold mb-2 text-ink-muted">Czasy (Lokalne użytkownika)</p>
                 <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[11px] font-mono break-words">
                    <span className="text-ink-muted">Planowany wylot (Scheduled Out):</span>
                    <span>{flightDetails.scheduledOut ? new Date(flightDetails.scheduledOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Przybliżony wylot (Estimated Out):</span>
                    <span>{flightDetails.estimatedOut ? new Date(flightDetails.estimatedOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Rzeczywisty wylot (Actual Out):</span>
                    <span>{flightDetails.actualOut ? new Date(flightDetails.actualOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted mt-2 border-t border-ink/10 pt-2">Planowany przylot (Scheduled In):</span>
                    <span className="mt-2 border-t border-ink/10 pt-2">{flightDetails.scheduledIn ? new Date(flightDetails.scheduledIn).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Przybliżony przylot (Estimated In):</span>
                    <span>{flightDetails.estimatedIn ? new Date(flightDetails.estimatedIn).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Rzeczywisty przylot (Actual In):</span>
                    <span>{flightDetails.actualIn ? new Date(flightDetails.actualIn).toLocaleString('pl-PL') : "-"}</span>
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
