import { useFlightDetails } from "@/common/hooks/useFlights";

/**
 * @deprecated Then plik nie powinien być uzywany.
 * W tym momencie jest to tylko placeholder w razie gdyby potrzebne było wyświetlanie danych
 *  o lotach w formie popupa
 */

export interface FlightDetailsProps {
  properties: {
    icao24: string;
    callsign?: string;
    altitude?: number | null;
    velocity?: number | null;
    heading?: number | null;
    onGround?: boolean;
  };
}

export function FlightDetails({ properties }: FlightDetailsProps) {
  // Use callsign or icao24 to fetch details, prioritizing callsign if it exists
  const icaoCode = properties.callsign ? properties.callsign.trim() : properties.icao24;

  const { data: flightDetails, isLoading, error } = useFlightDetails(icaoCode);

  return (
    <div className="flex flex-col gap-2 p-1 font-mono text-xs w-64 max-h-[400px] overflow-y-auto">
      <strong className="text-sm uppercase tracking-widest border-b-2 border-ink pb-1 flex justify-between">
        <span>{properties.callsign || "Brak callsign"}</span>
        <span className="text-ink-muted text-xs">AERO API</span>
      </strong>

      {/* Dane telemetryczne */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 mb-2 border-b border-ink/20 pb-2">
        <span className="text-ink-muted">ICAO24:</span>
        <span>{properties.icao24}</span>

        <span className="text-ink-muted">Wysokość:</span>
        <span>
          {properties.altitude != null
            ? `${Math.round(properties.altitude)} m`
            : "Brak"}
        </span>

        <span className="text-ink-muted">Prędkość:</span>
        <span>
          {properties.velocity != null
            ? `${Math.round(properties.velocity)} m/s`
            : "Brak"}
        </span>

        <span className="text-ink-muted">Status ADS-B:</span>
        <span>{properties.onGround ? "Na ziemi" : "W locie"}</span>
      </div>

      {/* Dane komerycyjne */}
      <div className="mt-1">
        {isLoading && (
            <div className="flex items-center justify-center p-4 text-ink-muted">
                <span className="animate-pulse">Pobieranie danych o locie</span>
            </div>
        )}

        {error !== null && (
            <div className="text-red-500 p-2 bg-red-50 border border-red-200">
                Nie udało się pobrać szczegółów lotu.
            </div>
        )}

        {!isLoading && error === null && flightDetails && (
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-ink-muted font-bold">Lot:</span>
                    <span className="font-bold">{flightDetails.operatingAirline?.name} {flightDetails.identIcao || flightDetails.callsign}</span>

                    <span className="text-ink-muted">Z:</span>
                    <span className="truncate" title={flightDetails.origin?.name}>
                        {flightDetails.origin?.icaoCode || "N/A"}
                        {flightDetails.terminalOrigin ? ` (T${flightDetails.terminalOrigin})` : ''}
                    </span>

                    <span className="text-ink-muted">Do:</span>
                    <span className="truncate" title={flightDetails.destination?.name}>
                        {flightDetails.destination?.icaoCode || "N/A"}
                        {flightDetails.terminalDestination ? ` (T${flightDetails.terminalDestination})` : ''}
                    </span>

                    <span className="text-ink-muted">Status:</span>
                    <span>{flightDetails.status?.name || "Brak"}</span>
                </div>

                {(flightDetails.departureDelay || flightDetails.arrivalDelay) ? (
                    <div className="mt-2 p-2 bg-ink/5 border border-ink/10">
                        <strong className="block mb-1">Opóźnienia:</strong>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {flightDetails.departureDelay ? (
                                <>
                                    <span className="text-ink-muted">Wylot:</span>
                                    <span className="text-red-600">{Math.round(flightDetails.departureDelay / 60)} min</span>
                                </>
                            ) : null}
                            {flightDetails.arrivalDelay ? (
                                <>
                                    <span className="text-ink-muted">Przylot:</span>
                                    <span className="text-red-600">{Math.round(flightDetails.arrivalDelay / 60)} min</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-ink-muted">Planowany wylot:</span>
                    <span>{flightDetails.scheduledOut ? new Date(flightDetails.scheduledOut).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'}) : "Brak"}</span>

                    <span className="text-ink-muted">Planowany przylot:</span>
                    <span>{flightDetails.scheduledIn ? new Date(flightDetails.scheduledIn).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'}) : "Brak"}</span>
                </div>
            </div>
        )}

        {!isLoading && error === null && !flightDetails && (
             <div className="text-ink-muted italic p-2">
                 Brak dodatkowych informacji komercyjnych.
             </div>
        )}
      </div>
    </div>
  );
}
