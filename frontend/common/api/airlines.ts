import { apiClient } from './client';

export interface Airline {
    icaoCode: string;
    iataCode: string | null;
    name: string;
}

export interface AirlineListResponse {
    items: Airline[];
    total: number;
    limit: number;
    offset: number;
}

export interface AirlineCreateInput {
    icaoCode: string;
    iataCode?: string | null;
    name: string;
}

export interface AirlineUpdateInput {
    iataCode?: string | null;
    name?: string;
}

export async function searchAirlines(q: string, limit = 20): Promise<Airline[]> {
    const { data } = await apiClient.get<Airline[]>('/airlines/search', {
        params: { q, limit },
    });
    return data;
}

export async function getAirlineByCode(code: string): Promise<Airline> {
    const { data } = await apiClient.get<Airline>(`/airlines/${encodeURIComponent(code)}`);
    return data;
}

export async function listAirlines(params: { limit?: number; offset?: number } = {}): Promise<AirlineListResponse> {
    const { data } = await apiClient.get<AirlineListResponse>('/airlines', { params });
    return data;
}

export async function createAirline(input: AirlineCreateInput): Promise<Airline> {
    const { data } = await apiClient.post<Airline>('/airlines', input);
    return data;
}

export async function updateAirline(code: string, input: AirlineUpdateInput): Promise<Airline> {
    const { data } = await apiClient.patch<Airline>(`/airlines/${encodeURIComponent(code)}`, input);
    return data;
}

export async function deleteAirline(code: string): Promise<void> {
    await apiClient.delete(`/airlines/${encodeURIComponent(code)}`);
}
