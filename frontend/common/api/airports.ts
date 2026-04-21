import { apiClient } from "./client";
import type { BoundingBoxDTO } from './telemetry';

export interface AirportCity {
  id: number;
  name: string;
  countryCode: string;
  countryName: string | null;
}

export interface Airport {
  icaoCode: string;
  iataCode: string | null;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  city: AirportCity | null;
}

export interface AirportListResponse {
  items: Airport[];
  total: number;
  limit: number;
  offset: number;
}

export interface AirportCreateInput {
  icaoCode: string;
  iataCode?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string;
  cityName: string;
}

export interface AirportUpdateInput {
  iataCode?: string | null;
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  countryCode?: string;
  cityName?: string;
}

export interface AirlineInfo {
    icaoCode: string;
    iataCode: string | null;
    name: string;
}

export interface AirlineWithDestinations {
    airline: AirlineInfo;
    destinations: Airport[];
}

export async function getAirportRoutes(icaoCode: string): Promise<AirlineWithDestinations[]> {
    const { data } = await apiClient.get<AirlineWithDestinations[]>(
        `/airports/${encodeURIComponent(icaoCode)}/routes`,
    );
    return data;
}

export async function getAirportsInArea(bbox: BoundingBoxDTO): Promise<Airport[]> {
    const { data } = await apiClient.get<Airport[]>('/airports/area', { params: bbox });
    return data;
}

export async function searchAirports(
  q: string,
  limit = 20,
): Promise<Airport[]> {
  const { data } = await apiClient.get<Airport[]>("/airports/search", {
    params: { q, limit },
  });
  return data;
}

export async function getAirportByCode(code: string): Promise<Airport> {
  const { data } = await apiClient.get<Airport>(
    `/airports/${encodeURIComponent(code)}`,
  );
  return data;
}

export async function listAirports(
  params: { limit?: number; offset?: number } = {},
): Promise<AirportListResponse> {
  const { data } = await apiClient.get<AirportListResponse>("/airports", {
    params,
  });
  return data;
}

export async function createAirport(
  input: AirportCreateInput,
): Promise<Airport> {
  const { data } = await apiClient.post<Airport>("/airports", input);
  return data;
}

export async function updateAirport(
  code: string,
  input: AirportUpdateInput,
): Promise<Airport> {
  const { data } = await apiClient.patch<Airport>(
    `/airports/${encodeURIComponent(code)}`,
    input,
  );
  return data;
}

export async function deleteAirport(code: string): Promise<void> {
  await apiClient.delete(`/airports/${encodeURIComponent(code)}`);
}
