import { useState, useEffect, useCallback } from 'react';
import { getAirportsInArea } from '../api/airports';
import type { Airport } from '../api/airports';
import type { BoundingBoxDTO } from '../api/telemetry';

interface UseAirportsResult {
    airports: Airport[];
    error: string | null;
    loading: boolean;
    setBounds: (bounds: BoundingBoxDTO) => void;
}

export function useAirports(): UseAirportsResult {
    const [airports, setAirports] = useState<Airport[]>([]);
    const [bounds, setBounds] = useState<BoundingBoxDTO | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleSetBounds = useCallback((newBounds: BoundingBoxDTO) => {
        setBounds((prev) => {
            if (
                prev &&
                prev.lomin === newBounds.lomin &&
                prev.lamin === newBounds.lamin &&
                prev.lomax === newBounds.lomax &&
                prev.lamax === newBounds.lamax
            ) {
                return prev;
            }
            return newBounds;
        });
    }, []);

    useEffect(() => {
        if (!bounds) return;

        let cancelled = false;
        setLoading(true);

        getAirportsInArea(bounds)
            .then((data) => {
                if (!cancelled) {
                    setAirports(data);
                    setError(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Nie udało się pobrać lotnisk.');
                    setAirports([]);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [bounds]);

    return { airports, error, loading, setBounds: handleSetBounds };
}
