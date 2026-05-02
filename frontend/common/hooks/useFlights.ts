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
