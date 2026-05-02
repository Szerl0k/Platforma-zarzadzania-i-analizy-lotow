import { z } from "zod";

export const FlightDetailsQuerySchema = z.object({
  icaoCode: z
    .string()
    .min(1, "Kod ICAO jest wymagany do pobrania szczegółów lotu."),
});

export type FlightDetailsQuery = z.infer<typeof FlightDetailsQuerySchema>;

export interface AirportDTO {
  icaoCode: string;
  iataCode: string | null;
  name: string;
  city?: {
    name: string;
    countryName: string | null;
  };
}

export interface AirlineDTO {
  icaoCode: string;
  name: string;
}

export interface FlightStatusDTO {
  id: number;
  name: string;
  category: string | null;
}

export interface FlightDetailsResponseDTO {
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
  status?: FlightStatusDTO;
  origin?: AirportDTO | null;
  destination?: AirportDTO | null;
  operatingAirline?: AirlineDTO | null;
}
