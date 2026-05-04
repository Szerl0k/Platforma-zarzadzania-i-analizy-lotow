"use client";

import { Spinner, Alert } from "@/common/components";
import { useFlightDetailsById } from "@/common/hooks/useFlights";
import { useLocateFlight } from "@/common/hooks/useTelemetry";
import { useMemo, useEffect, useState } from "react";
import { 
  calculateFlightDuration, 
  formatDuration, 
  calculateMinutesBetween, 
  calculateTimeRemaining 
} from "@/common/utils/flightUtils";

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
  // Local state for "Time Left" to allow it to tick if needed, though minutes is fine for static render
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Detailed telemetry fetch using ICAO24 (map click)
  const locateParams = useMemo(() => ({ icao24: properties.icao24 }), [properties.icao24]);
  const { data: detailedTelemetry, loading: isLocating } = useLocateFlight(locateParams);

  const { 
    data: flightDetails, 
    isLoading: isFlightLoading, 
    error: flightError 
  } = useFlightDetailsById(detailedTelemetry?.internalFlightId || null);

  const metrics = useMemo(() => {
    if (!flightDetails) return null;

    const currentDuration = calculateFlightDuration(
      { 
        actual: flightDetails.actualOut, 
        estimated: flightDetails.estimatedOut, 
        scheduled: flightDetails.scheduledOut 
      },
      { 
        actual: flightDetails.actualIn, 
        estimated: flightDetails.estimatedIn, 
        scheduled: flightDetails.scheduledIn 
      }
    );

    const plannedDuration = calculateMinutesBetween(
      flightDetails.scheduledOut, 
      flightDetails.scheduledIn
    );

    const estimatedDuration = calculateMinutesBetween(
      flightDetails.estimatedOut || flightDetails.scheduledOut, 
      flightDetails.estimatedIn || flightDetails.scheduledIn
    );

    const timeLeft = calculateTimeRemaining(
      flightDetails.estimatedIn || flightDetails.scheduledIn
    );

    return {
      currentDuration,
      plannedDuration,
      estimatedDuration,
      timeLeft
    };
  }, [flightDetails]);

  return (
    <div className="h-full flex flex-col overflow-hidden w-full">
      {/* Header */}
      <div className="p-3 border-b-2 border-ink shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
              Szczegóły lotu
            </p>
            <p className="font-mono font-bold text-base uppercase tracking-widest text-ink truncate">
              {properties.callsign || detailedTelemetry?.faFlightId || "Brak callsign"}
            </p>
            <p className="text-xs text-ink-muted font-mono mt-0.5">
              ICAO24: {properties.icao24}
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

      {/* Visual Timeline */}
      {flightDetails && (
        <div className="p-4 bg-ink/5 border-b border-ink/10 shrink-0">
          <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
            {/* Origin */}
            <div className="flex flex-col items-center gap-1 min-w-[70px]">
              <p className="text-sm font-mono text-ink-muted truncate max-w-[90px] leading-none mb-1 font-medium">
                {flightDetails.origin?.city?.name || "???"}
              </p>
              <img src="/airport.png" alt="Airport" className="w-8 h-8 object-contain grayscale opacity-80" />
              <div className="text-center mt-1">
                <p className="font-bold text-sm leading-none">{flightDetails.origin?.iataCode || "???"}</p>
                <p className="text-xs font-mono text-ink-muted uppercase">{flightDetails.origin?.icaoCode || "????"}</p>
              </div>
            </div>

            {/* Path */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-center justify-center">
                <div className="flex-1 h-[2px] opacity-20 bg-dotted-path"></div>
                <div className="mx-3 rotate-90 shrink-0">
                  <img src="/airplane.png" alt="Plane" className="w-7 h-7 object-contain grayscale opacity-80" />
                </div>
                <div className="flex-1 h-[2px] opacity-20 bg-dotted-path"></div>
              </div>
              <p className="font-mono text-xs font-bold text-ink-muted">
                ~{formatDuration(metrics?.currentDuration || null)}
              </p>
            </div>

            {/* Destination */}
            <div className="flex flex-col items-center gap-1 min-w-[70px]">
              <p className="text-sm font-mono text-ink-muted truncate max-w-[90px] leading-none mb-1 font-medium">
                {flightDetails.destination?.city?.name || "???"}
              </p>
              <img src="/airport.png" alt="Airport" className="w-8 h-8 object-contain grayscale opacity-80" />
              <div className="text-center mt-1">
                <p className="font-bold text-sm leading-none">{flightDetails.destination?.iataCode || "???"}</p>
                <p className="text-xs font-mono text-ink-muted uppercase">{flightDetails.destination?.icaoCode || "????"}</p>
              </div>
            </div>
          </div>
        </div>
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
            <span className="text-ink-muted text-sm flex items-center">Wysokość:</span>
            <span className="font-mono font-medium text-base">
              {properties.altitude != null ? `${Math.round(properties.altitude)} m` : "Brak"}
            </span>

            <span className="text-ink-muted text-sm flex items-center">Prędkość:</span>
            <span className="font-mono font-medium text-base">
              {properties.velocity != null ? `${Math.round(properties.velocity)} m/s` : "Brak"}
            </span>

            <span className="text-ink-muted text-sm flex items-center">Kierunek:</span>
            <span className="font-mono font-medium text-base">
              {properties.heading != null ? `${Math.round(properties.heading)}°` : "Brak"}
            </span>

            <span className="text-ink-muted text-sm flex items-center">Status ADS-B:</span>
            <span className="font-mono font-medium text-base">
              {properties.onGround ? "Na ziemi" : "W locie"}
            </span>

            {/* PostGIS distances */}
            {detailedTelemetry?.distanceFromOriginKm != null && (
              <>
                <span className="text-ink-muted text-sm border-t border-ink/5 pt-2 mt-1 flex items-center">Odległość od wylotu:</span>
                <span className="font-mono text-success font-bold border-t border-ink/5 pt-2 mt-1 text-base">
                  {Math.round(detailedTelemetry.distanceFromOriginKm)} km
                </span>
              </>
            )}

            {detailedTelemetry?.distanceToDestinationKm != null && (
              <>
                <span className="text-ink-muted text-sm flex items-center">Do celu:</span>
                <span className="font-mono text-success font-bold text-base">
                  {Math.round(detailedTelemetry.distanceToDestinationKm)} km
                </span>
              </>
            )}
          </div>
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
                  <span className="text-ink-muted text-sm flex items-center">Identyfikator ICAO:</span>
                  <span className="font-medium text-base">{flightDetails.identIcao}</span>

                  <span className="text-ink-muted text-sm flex items-center">Identyfikator IATA:</span>
                  <span className="font-medium text-base">{flightDetails.identIata || "Brak"}</span>

                  <span className="text-ink-muted text-sm flex items-center">Identyfikator FA:</span>
                  <span className="font-medium text-base">{flightDetails.faFlightId || "Brak"}</span>

                  <span className="text-ink-muted text-sm flex items-center">Callsign:</span>
                  <span className="font-medium text-base">{flightDetails.callsign}</span>

                  {/* Airline */}
                  <span className="text-ink-muted text-sm flex items-center">Linia lotnicza:</span>
                  <span className="font-medium text-base">
                      {flightDetails.operatingAirline?.name || "Brak"}
                      {flightDetails.operatingAirline?.icaoCode && ` (${flightDetails.operatingAirline.icaoCode})`}
                  </span>

                  {/* Origin */}
                  <span className="text-ink-muted text-sm mt-2 flex items-start pt-1">Wylot:</span>
                  <span className="mt-2">
                      <span className="font-medium block text-base">{flightDetails.origin?.name || flightDetails.origin?.icaoCode || "N/A"}</span>
                      <span className="text-xs font-mono text-ink-muted block uppercase">
                         {flightDetails.origin?.city?.name}{flightDetails.origin?.city?.countryName ? `, ${flightDetails.origin.city.countryName}` : ''}
                      </span>
                  </span>

                  <span className="text-ink-muted text-sm flex items-center">Terminal/Bramka (Wylot):</span>
                  <span className="font-medium text-base">
                    {flightDetails.terminalOrigin ? `T${flightDetails.terminalOrigin}` : "-"}
                    {" / "}
                    {flightDetails.gateOrigin ? `G${flightDetails.gateOrigin}` : "-"}
                  </span>

                  {/* Destination */}
                  <span className="text-ink-muted text-sm mt-2 flex items-start pt-1">Przylot:</span>
                  <span className="mt-2">
                      <span className="font-medium block text-base">{flightDetails.destination?.name || flightDetails.destination?.icaoCode || "N/A"}</span>
                      <span className="text-xs font-mono text-ink-muted block uppercase">
                         {flightDetails.destination?.city?.name}{flightDetails.destination?.city?.countryName ? `, ${flightDetails.destination.city.countryName}` : ''}
                      </span>
                  </span>

                  <span className="text-ink-muted text-sm flex items-center">Terminal/Bramka (Przylot):</span>
                  <span className="font-medium text-base">
                    {flightDetails.terminalDestination ? `T${flightDetails.terminalDestination}` : "-"}
                    {" / "}
                    {flightDetails.gateDestination ? `G${flightDetails.gateDestination}` : "-"}
                  </span>

                  {/* Status */}
                  <span className="text-ink-muted text-sm mt-2 flex items-center pt-1">Status lotu:</span>
                  <span className="font-medium mt-2 text-base">{flightDetails.status?.name || "Brak"}</span>

                  {/* Duration Metrics */}
                  <span className="text-ink-muted text-sm flex items-center border-t border-ink/5 pt-2 mt-2">Czas lotu (Priorytetowy):</span>
                  <span className="font-mono font-bold text-base border-t border-ink/5 pt-2 mt-2">{formatDuration(metrics?.currentDuration || null)}</span>

                  <span className="text-ink-muted text-sm flex items-center">Czas lotu (Planowany):</span>
                  <span className="font-mono text-base">{formatDuration(metrics?.plannedDuration || null)}</span>

                  <span className="text-ink-muted text-sm flex items-center">Czas lotu (Estymowany):</span>
                  <span className="font-mono text-base">{formatDuration(metrics?.estimatedDuration || null)}</span>

                  <span className="text-ink-muted text-sm flex items-center">Pozostało czasu:</span>
                  <span className={`font-mono font-bold text-base ${(metrics?.timeLeft ?? 0) < 0 ? 'text-danger' : 'text-navy'}`}>
                    {formatDuration(metrics?.timeLeft || null)}
                  </span>
              </div>

              {/* Delays */}
              {(flightDetails.departureDelay || flightDetails.arrivalDelay) ? (
                  <div className="p-4 bg-ink/5 border border-ink/10 rounded-sm">
                      <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3 text-ink-muted">Opóźnienia</p>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm font-mono break-words">
                          {flightDetails.departureDelay ? (
                              <>
                                  <span className="text-ink-muted text-sm flex items-center">Wylot:</span>
                                  <span className="text-danger font-bold text-base">{Math.round(flightDetails.departureDelay / 60)} min</span>
                              </>
                          ) : null}
                          {flightDetails.arrivalDelay ? (
                              <>
                                  <span className="text-ink-muted text-sm flex items-center">Przylot:</span>
                                  <span className="text-danger font-bold text-base">{Math.round(flightDetails.arrivalDelay / 60)} min</span>
                              </>
                          ) : null}
                      </div>
                  </div>
              ) : null}

              {/* Times */}
              <div className="mt-2 border-t border-border-subtle pt-4">
                 <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3 text-ink-muted">Czasy (Lokalne użytkownika)</p>
                 <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm font-mono break-words">
                    <span className="text-ink-muted text-sm flex items-center">Planowany wylot:</span>
                    <span className="font-medium text-sm">{flightDetails.scheduledOut ? new Date(flightDetails.scheduledOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted text-sm flex items-center">Przybliżony wylot:</span>
                    <span className="font-medium text-sm">{flightDetails.estimatedOut ? new Date(flightDetails.estimatedOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted text-sm flex items-center">Rzeczywisty wylot:</span>
                    <span className="font-medium text-sm">{flightDetails.actualOut ? new Date(flightDetails.actualOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted text-sm mt-2 border-t border-ink/10 pt-3 flex items-center">Planowany przylot:</span>
                    <span className="mt-2 border-t border-ink/10 pt-3 font-medium text-sm">{flightDetails.scheduledIn ? new Date(flightDetails.scheduledIn).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted text-sm flex items-center">Przybliżony przylot:</span>
                    <span className="font-medium text-sm">{flightDetails.estimatedIn ? new Date(flightDetails.estimatedIn).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted text-sm flex items-center">Rzeczywisty przylot:</span>
                    <span className="font-medium text-sm">{flightDetails.actualIn ? new Date(flightDetails.actualIn).toLocaleString('pl-PL') : "-"}</span>
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
