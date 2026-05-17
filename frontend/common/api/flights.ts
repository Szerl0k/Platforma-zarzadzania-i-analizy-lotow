import { apiClient } from "./client";

export interface FlightDetailsResponse {
  id: string;
  identIcao: string;
  identIata: string | null;
  operatingAirlineIcao: string | null;
  callsign: string;
  faFlightId: string | null;
  originIcao: string | null;
  destinationIcao: string | null;
  statusId: number;
  terminalOrigin: string | null;
  gateOrigin: string | null;
  terminalDestination: string | null;
  gateDestination: string | null;
  departureDelay: number | null;
  arrivalDelay: number | null;
  scheduledOut: string | null;
  estimatedOut: string | null;
  actualOut: string | null;
  scheduledIn: string | null;
  estimatedIn: string | null;
  actualIn: string | null;
  status?: {
    id: number;
    name: string;
    category: string | null;
  };
  origin?: {
    icaoCode: string;
    iataCode: string | null;
    name: string;
    city?: {
      name: string;
      countryName?: string | null;
    };
  };
  destination?: {
    icaoCode: string;
    iataCode: string | null;
    name: string;
    city?: {
      name: string;
      countryName?: string | null;
    };
  };
  operatingAirline?: {
    icaoCode: string;
    name: string;
  };
  isLive: boolean;
}

export const flightApi = {
  searchFlights: async (
    ident: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FlightDetailsResponse[]> => {
    const { data } = await apiClient.get<FlightDetailsResponse[]>(
      "/flights/search",
      {
        params: { ident, startDate, endDate },
      },
    );
    return data;
  },

  syncFlights: async (
    ident: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FlightDetailsResponse[]> => {
    const { data } = await apiClient.post<FlightDetailsResponse[]>(
      "/flights/sync",
      {
        ident,
        startDate,
        endDate,
      },
    );
    return data;
  },

  getFlightDetails: async (ident: string): Promise<FlightDetailsResponse> => {
    const { data } = await apiClient.get<FlightDetailsResponse>(
      "/flights/details",
      {
        params: { ident },
      },
    );
    return data;
  },

  getFlightById: async (id: string): Promise<FlightDetailsResponse> => {
    const { data } = await apiClient.get<FlightDetailsResponse>(
      `/flights/${id}`,
    );
    return data;
  },

  getFlightPath: async (
    id: string,
  ): Promise<{ traveled: any; remaining: any }> => {
    const { data } = await apiClient.get<{ traveled: any; remaining: any }>(
      `/flights/${id}/path`,
    );
    return data;
  },
};
