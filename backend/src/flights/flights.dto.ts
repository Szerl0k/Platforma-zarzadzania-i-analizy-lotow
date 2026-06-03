import { z } from "zod";

export const FlightDetailsQuerySchema = z.object({
  ident: z
    .string()
    .min(1, "Kod identyfikacyjny lotu (ICAO/IATA) jest wymagany."),
});

export type FlightDetailsQuery = z.infer<typeof FlightDetailsQuerySchema>;

export const FlightListQuerySchema = z.object({
  ident: z
    .string()
    .min(1, "Kod identyfikacyjny lotu (ICAO/IATA) jest wymagany."),
  startDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Data początkowa musi być w formacie YYYY-MM-DD.",
    )
    .optional(),
  endDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Data końcowa musi być w formacie YYYY-MM-DD.",
    )
    .optional(),
});

export type FlightListQuery = z.infer<typeof FlightListQuerySchema>;

export const CreateFlightSchema = z.object({
  identIcao: z.string().min(1),
  identIata: z.string().nullable().optional(),
  operatingAirlineIcao: z.string().length(3).nullable().optional(),
  callsign: z.string().min(1),
  faFlightId: z.string().nullable().optional(),
  originIcao: z.string().length(4).nullable().optional(),
  destinationIcao: z.string().length(4).nullable().optional(),
  statusId: z.number().int().positive(),
  terminalOrigin: z.string().nullable().optional(),
  gateOrigin: z.string().nullable().optional(),
  terminalDestination: z.string().nullable().optional(),
  gateDestination: z.string().nullable().optional(),
  departureDelay: z.number().int().nullable().optional(),
  arrivalDelay: z.number().int().nullable().optional(),
  scheduledOut: z.string().datetime().nullable().optional(),
  estimatedOut: z.string().datetime().nullable().optional(),
  actualOut: z.string().datetime().nullable().optional(),
  scheduledIn: z.string().datetime().nullable().optional(),
  estimatedIn: z.string().datetime().nullable().optional(),
  actualIn: z.string().datetime().nullable().optional(),
});

export type CreateFlightDTO = z.infer<typeof CreateFlightSchema>;

export const UpdateFlightSchema = CreateFlightSchema.partial();

export type UpdateFlightDTO = z.infer<typeof UpdateFlightSchema>;

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
  isLive: boolean;
  source: "database" | "AeroAPI";
}
