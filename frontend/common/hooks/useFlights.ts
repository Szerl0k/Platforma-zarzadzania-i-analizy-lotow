import { useState, useEffect } from "react";
import { flightApi, FlightDetailsResponse } from "../api/flights";

export function useFlightDetails(icaoCode: string | null) {
  const [data, setData] = useState<FlightDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isMounted = true;

    if (!icaoCode) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await flightApi.getFlightDetails(icaoCode);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [icaoCode]);

  return { data, isLoading, error };
}

export function useFlightDetailsById(id: string | null) {
  const [data, setData] = useState<FlightDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await flightApi.getFlightById(id);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { data, isLoading, error };
}

/**
 * Hook to fetch and manage flight path segments (traveled/remaining).
 * 
 * @param id - The UUID of the flight.
 * @calledBy TelemetryMapView
 */
export function useFlightPath(id: string | null) {
  const [pathData, setPathData] = useState<{ traveled: any; remaining: any } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setPathData(null);
      setIsLoading(false);
      return;
    }

    const fetchPath = async () => {
      setIsLoading(true);
      try {
        const result = await flightApi.getFlightPath(id);
        if (isMounted) {
          setPathData(result);
        }
      } catch (err) {
        console.error("Failed to fetch flight path:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchPath();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { pathData, isLoading };
}

