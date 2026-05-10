import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD");

const csvCountryCodes = z
  .string()
  .optional()
  .transform((value) =>
    value
      ? value
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c))
      : undefined,
  );

export const SearchCityBreakQuerySchema = z
  .object({
    origin: z.string().min(2, "Punkt startu jest wymagany").max(64),
    dateFrom: isoDate,
    dateTo: isoDate,
    maxFlightHours: z.coerce.number().positive().max(24).optional(),
    maxDistanceKm: z.coerce.number().positive().max(20000).optional(),
    excludeCountryCodes: csvCountryCodes,
    sortBy: z.enum(["flightTime", "popularity"]).default("flightTime"),
  })
  .refine(
    (data) => new Date(data.dateFrom).getTime() <= new Date(data.dateTo).getTime(),
    { message: "dateFrom musi być wcześniejsze lub równe dateTo", path: ["dateFrom"] },
  );

export type SearchCityBreakQuery = z.infer<typeof SearchCityBreakQuerySchema>;

export const ProposalDetailsQuerySchema = z.object({
  origin: z.string().min(2).max(8),
  dateFrom: isoDate,
  dateTo: isoDate,
});

export type ProposalDetailsQuery = z.infer<typeof ProposalDetailsQuerySchema>;

export interface CityBreakProposalDTO {
  destinationIcao: string;
  destinationIata: string | null;
  cityName: string | null;
  countryName: string | null;
  countryCode: string | null;
  airportName: string;
  minFlightDurationMinutes: number;
  flightCount: number;
  airlines: string[];
  distanceKm: number | null;
}

export interface ProposalFlightOptionDTO {
  airlineIcao: string | null;
  airlineIata: string | null;
  airlineName: string | null;
  flightNumber: string | null;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  durationMinutes: number | null;
  isDirect: boolean;
  stops: number;
}

export interface ProposalDetailsDTO {
  originIcao: string;
  destinationIcao: string;
  options: ProposalFlightOptionDTO[];
}
