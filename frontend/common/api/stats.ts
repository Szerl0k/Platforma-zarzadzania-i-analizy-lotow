import { apiClient } from "./client";

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

export async function getMyStats(): Promise<UserStatsDTO> {
  const { data } = await apiClient.get<UserStatsDTO>("/stats/me");
  return data;
}

export async function getMyRoutes(year?: number): Promise<UserRouteDTO[]> {
  const { data } = await apiClient.get<UserRouteDTO[]>("/stats/me/routes", {
    params: year ? { year } : undefined,
  });
  return data;
}
