import { apiClient } from "./client";
import { Point } from "geojson";

export interface BoundingBoxDTO {
  lomin: number;
  lamin: number;
  lomax: number;
  lamax: number;
}

export interface FlightPositionDTO {
  icao24: string;
  callsign?: string | null;
  location?: Point | null;
  altitude?: number | null;
  velocity?: number | null;
  heading?: number | null;
  onGround: boolean;
  originCountry?: string | null;
  category?: number | null;
}

export interface LocateFlightResponseDTO {
  icao24: string;
  faFlightId: string;
  internalFlightId: string;
  location: Point;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  onGround: boolean;
  distanceFromOriginKm?: number | null;
  distanceToDestinationKm?: number | null;
  persistedAt: string;
}

export interface LocateFlightParams {
  faFlightId?: string;
  icao24?: string;
}

export async function getFlightsInArea(
  params: BoundingBoxDTO,
): Promise<FlightPositionDTO[]> {
  const { data } = await apiClient.get<FlightPositionDTO[]>("/telemetry/area", {
    params,
  });
  return data;
}

export async function locateFlight(
  params: LocateFlightParams,
): Promise<LocateFlightResponseDTO> {
  const { data } = await apiClient.get<LocateFlightResponseDTO>(
    "/telemetry/locate",
    { params },
  );
  return data;
}
