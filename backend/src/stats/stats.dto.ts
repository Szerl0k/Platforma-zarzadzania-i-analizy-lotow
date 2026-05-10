import { z } from "zod";

export const RoutesQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2200).optional(),
});
export type RoutesQueryDTO = z.infer<typeof RoutesQuerySchema>;

export const RankingMetricSchema = z.enum(["distance", "flights", "countries"]);
export type RankingMetric = z.infer<typeof RankingMetricSchema>;

export const RankingsQuerySchema = z.object({
  metric: RankingMetricSchema.default("distance"),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});
export type RankingsQueryDTO = z.infer<typeof RankingsQuerySchema>;

export const MyRankingQuerySchema = z.object({
  metric: RankingMetricSchema.default("distance"),
});
export type MyRankingQueryDTO = z.infer<typeof MyRankingQuerySchema>;

export interface AirlineCountDTO {
  icao: string;
  name: string;
  count: number;
}

export interface LongestFlightDTO {
  ident: string | null;
  originIcao: string | null;
  destinationIcao: string | null;
  distanceKm: number;
  durationMinutes: number | null;
  travelDate: string;
}

export interface YearStatsDTO {
  year: number;
  flights: number;
  distanceKm: number;
}

export interface UserStatsDTO {
  totalFlights: number;
  totalDistanceKm: number;
  totalAirTimeMinutes: number;
  countriesVisited: number;
  airportsVisited: number;
  topAirline: AirlineCountDTO | null;
  longestFlight: LongestFlightDTO | null;
  averageDurationMinutes: number;
  perYear: YearStatsDTO[];
  topAirlines: AirlineCountDTO[];
}

export interface UserRouteDTO {
  id: string;
  travelDate: string;
  ident: string | null;
  airlineIcao: string | null;
  airlineName: string | null;
  originIcao: string | null;
  originIata: string | null;
  originName: string | null;
  originLat: number | null;
  originLon: number | null;
  destinationIcao: string | null;
  destinationIata: string | null;
  destinationName: string | null;
  destinationLat: number | null;
  destinationLon: number | null;
  durationMinutes: number | null;
  distanceKm: number | null;
}

export interface RankingEntryDTO {
  rank: number;
  userId: string;
  nickname: string;
  value: number;
}

export interface MyRankingResponseDTO {
  hidden?: true;
  entry?: RankingEntryDTO;
}
