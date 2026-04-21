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
  return (
    <div className="flex flex-col gap-2 p-1 font-mono text-xs">
      <strong className="text-sm uppercase tracking-widest border-b-2 border-ink pb-1">
        {properties.callsign || "Brak callsign"}
      </strong>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
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

        <span className="text-ink-muted">Status:</span>
        <span>{properties.onGround ? "Na ziemi" : "W locie"}</span>
      </div>
    </div>
  );
}
