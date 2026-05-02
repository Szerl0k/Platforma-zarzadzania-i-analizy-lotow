"use client";

import { Spinner, Alert } from "@/common/components";
import { useFlightDetails } from "@/common/hooks/useFlights";

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
  const icaoCode = properties.callsign ? properties.callsign.trim() : properties.icao24;
  
  const { data: flightDetails, isLoading, error } = useFlightDetails(icaoCode);

  return (
    <div className="w-80 h-full flex flex-col bg-surface border-r-2 border-ink overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b-2 border-ink shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
              Szczegóły lotu
            </p>
            <p className="font-mono font-bold text-sm uppercase tracking-widest text-ink truncate">
              {properties.callsign || "Brak callsign"}
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
        
        {/* OpenSky Telemetry Data */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2 pb-1 border-b border-border-subtle">
            Dane Telemetryczne (OpenSky)
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
          </div>
        </section>

        {/* AeroAPI Commercial Data */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-2 pb-1 border-b border-border-subtle">
            Dane Komercyjne (AeroAPI)
          </p>

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-muted">
              <Spinner size="sm" />
              <p className="font-mono text-xs uppercase tracking-widest animate-pulse">
                Pobieranie danych...
              </p>
            </div>
          )}

          {error !== null && (
             <Alert variant="error">Nie udało się pobrać szczegółów lotu.</Alert>
          )}

          {!isLoading && error === null && flightDetails && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {/* Identifiers */}
                  <span className="text-ink-muted">Identyfikator ICAO:</span>
                  <span className="font-medium truncate">{flightDetails.identIcao}</span>

                  <span className="text-ink-muted">Identyfikator IATA:</span>
                  <span className="font-medium truncate">{flightDetails.identIata || "Brak"}</span>

                  <span className="text-ink-muted">Identyfikator FA:</span>
                  <span className="font-medium truncate text-[10px]" title={flightDetails.faFlightId || ""}>{flightDetails.faFlightId || "Brak"}</span>

                  <span className="text-ink-muted">Callsign:</span>
                  <span className="font-medium truncate">{flightDetails.callsign}</span>

                  {/* Airline */}
                  <span className="text-ink-muted">Linia lotnicza:</span>
                  <span className="font-medium truncate" title={flightDetails.operatingAirline?.name}>
                      {flightDetails.operatingAirline?.name || "Brak"}
                      {flightDetails.operatingAirline?.icaoCode && ` (${flightDetails.operatingAirline.icaoCode})`}
                  </span>
                  
                  {/* Origin */}
                  <span className="text-ink-muted">Wylot:</span>
                  <span className="truncate" title={flightDetails.origin?.name}>
                      {flightDetails.origin?.name || flightDetails.origin?.icaoCode || "N/A"}
                      <span className="text-[10px] text-ink-muted block">
                         {flightDetails.origin?.city?.name}{flightDetails.origin?.city?.countryName ? `, ${flightDetails.origin.city.countryName}` : ''}
                      </span>
                  </span>

                  <span className="text-ink-muted">Terminal/Bramka (Wylot):</span>
                  <span>
                    {flightDetails.terminalOrigin ? `T${flightDetails.terminalOrigin}` : "-"}
                    {" / "}
                    {flightDetails.gateOrigin ? `G${flightDetails.gateOrigin}` : "-"}
                  </span>
                  
                  {/* Destination */}
                  <span className="text-ink-muted">Przylot:</span>
                  <span className="truncate" title={flightDetails.destination?.name}>
                      {flightDetails.destination?.name || flightDetails.destination?.icaoCode || "N/A"}
                      <span className="text-[10px] text-ink-muted block">
                         {flightDetails.destination?.city?.name}{flightDetails.destination?.city?.countryName ? `, ${flightDetails.destination.city.countryName}` : ''}
                      </span>
                  </span>

                  <span className="text-ink-muted">Terminal/Bramka (Przylot):</span>
                  <span>
                    {flightDetails.terminalDestination ? `T${flightDetails.terminalDestination}` : "-"}
                    {" / "}
                    {flightDetails.gateDestination ? `G${flightDetails.gateDestination}` : "-"}
                  </span>

                  {/* Status */}
                  <span className="text-ink-muted">Status lotu:</span>
                  <span className="font-medium">{flightDetails.status?.name || "Brak"}</span>
              </div>

              {/* Delays */}
              {(flightDetails.departureDelay || flightDetails.arrivalDelay) ? (
                  <div className="p-3 bg-(--color-ink)/5 border border-ink/10 rounded-sm">
                      <p className="text-xs uppercase tracking-widest font-bold mb-2">Opóźnienia</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono">
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
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono">
                    <span className="text-ink-muted">Plan. wylot (Scheduled Out):</span>
                    <span>{flightDetails.scheduledOut ? new Date(flightDetails.scheduledOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Est. wylot (Estimated Out):</span>
                    <span>{flightDetails.estimatedOut ? new Date(flightDetails.estimatedOut).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Rzecz. wylot (Actual Out):</span>
                    <span>{flightDetails.actualOut ? new Date(flightDetails.actualOut).toLocaleString('pl-PL') : "-"}</span>
                    
                    <span className="text-ink-muted mt-2">Plan. przylot (Scheduled In):</span>
                    <span className="mt-2">{flightDetails.scheduledIn ? new Date(flightDetails.scheduledIn).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Est. przylot (Estimated In):</span>
                    <span>{flightDetails.estimatedIn ? new Date(flightDetails.estimatedIn).toLocaleString('pl-PL') : "-"}</span>

                    <span className="text-ink-muted">Rzecz. przylot (Actual In):</span>
                    <span>{flightDetails.actualIn ? new Date(flightDetails.actualIn).toLocaleString('pl-PL') : "-"}</span>
                 </div>
              </div>

            </div>
          )}

          {!isLoading && error === null && !flightDetails && (
            <p className="text-sm text-ink-muted italic py-4">
              Brak dodatkowych informacji komercyjnych dla tego lotu.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
