import { apiClient } from './client';
import {Point} from "geojson";

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
}


export async function getFlightsInArea(params: BoundingBoxDTO): Promise<FlightPositionDTO[]> {
    const { data } = await apiClient.get<FlightPositionDTO[]>('/telemetry/area', { params });
    return data;
}