interface AirportDetailsProps {
    properties: {
        icaoCode: string;
        iataCode?: string | null;
        name: string;
        cityName?: string | null;
        countryName?: string | null;
        timezone: string;
    };
}

export function AirportDetails({ properties }: AirportDetailsProps) {
    return (
        <div className="flex flex-col gap-2 p-1 font-mono text-xs">
            <strong className="text-sm uppercase tracking-widest border-b-2 border-ink pb-1">
                {properties.name}
            </strong>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                <span className="text-ink-muted">ICAO:</span>
                <span>{properties.icaoCode}</span>

                <span className="text-ink-muted">IATA:</span>
                <span>{properties.iataCode ?? '—'}</span>

                <span className="text-ink-muted">Miasto:</span>
                <span>{properties.cityName ?? '—'}</span>

                <span className="text-ink-muted">Kraj:</span>
                <span>{properties.countryName ?? '—'}</span>

                <span className="text-ink-muted">Strefa:</span>
                <span>{properties.timezone}</span>
            </div>
        </div>
    );
}
