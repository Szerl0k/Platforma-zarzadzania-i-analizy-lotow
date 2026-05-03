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
    }
  };
  destination?: {
    icaoCode: string;
    iataCode: string | null;
    name: string;
    city?: {
        name: string;
        countryName?: string | null;
    }
  };
  operatingAirline?: {
    icaoCode: string;
    name: string;
  };
}

export const flightApi = {
  getFlightDetails: async (icaoCode: string): Promise<FlightDetailsResponse> => {
    const { data } = await apiClient.get<FlightDetailsResponse>("/flights/details", {
      params: { icaoCode },
    });
    return data;
  },
};
