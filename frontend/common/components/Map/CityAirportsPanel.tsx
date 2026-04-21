'use client';

import type { Airport } from '@/common/api/airports';

interface CityAirportsPanelProps {
    airports: Airport[];
    selectedIcao: string | null;
    onSelect: (airport: Airport) => void;
    onClose: () => void;
}

export function CityAirportsPanel({ airports, selectedIcao, onSelect, onClose }: CityAirportsPanelProps) {
    const city = airports[0]?.city;

    return (
        <div className="w-80 h-full flex flex-col bg-surface border-r-2 border-ink overflow-hidden">

            {/* Header */}
            <div className="p-3 border-b-2 border-ink shrink-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                            Wyniki wyszukiwania
                        </p>
                        <p className="font-mono font-bold text-sm uppercase tracking-widest text-ink truncate">
                            {city ? city.name : 'Lotniska'}
                        </p>
                        {city?.countryName && (
                            <p className="text-xs text-ink-muted">{city.countryName}</p>
                        )}
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

            {/* Airport list */}
            <div className="flex-1 overflow-y-auto">
                <ul className="divide-y divide-border-subtle">
                    {airports.map((airport) => {
                        const isSelected = selectedIcao === airport.icaoCode;
                        return (
                            <li key={airport.icaoCode}>
                                <button
                                    onClick={() => onSelect(airport)}
                                    className={`w-full text-left px-3 py-3 transition-colors ${
                                        isSelected ? 'bg-navy text-white' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-ink'}`}>
                                            {airport.name}
                                        </p>
                                        <span className={`font-mono text-[10px] shrink-0 ${isSelected ? 'text-blue-200' : 'text-ink-muted'}`}>
                                            {airport.icaoCode}{airport.iataCode && ` / ${airport.iataCode}`}
                                        </span>
                                    </div>
                                    <p className={`text-xs font-mono mt-0.5 ${isSelected ? 'text-blue-200' : 'text-ink-muted'}`}>
                                        {airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}
                                    </p>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
