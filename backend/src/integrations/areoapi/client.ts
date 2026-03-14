import axios, {AxiosInstance} from 'axios';

import {
    AeroAPIPaginatedResponse,
    AeroAPIQueryParams,
    AeroAPIAirportFlightParams,
    AeroAPIAirportInfo,
    AeroAPIFlight,
    AeroAPIFlightsResponse,
    AeroAPILocation,
    AeroAPIRoute,
    AeroAPIRoutesResponse
} from './types'

export class AeroAPIClient {
    private readonly apiUrl = "https://aeroapi.flightaware.com/aeroapi";
    private readonly apiKey: string;
    private readonly httpClient: AxiosInstance;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Authorization credentials for AreoAPI are missing');
        }

        this.apiKey = apiKey;
        this.httpClient = axios.create({
            baseURL: this.apiUrl,
            timeout: 15000,
            headers: {
                'x-apikey': this.apiKey,
                'Accept': 'application/json'
            }
        });
    }

    private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        try {
            const res = await this.httpClient.get<T>(endpoint, {params});
            return res.data;
        } catch (error) {
            this.handleAxiosError(error, `AreoAPI request failed for endpoint: ${endpoint}`);
        }
    }

    private handleAxiosError(error: unknown, customMessage: string): never {
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status || 'Unknown Status';
            const responseData = JSON.stringify(error.response?.data || {});
            throw new Error(`${customMessage} | Status: ${statusCode} | Details: ${responseData} | Message: ${error.message}`);
        }
        throw new Error(`${customMessage} | Unexpected error: ${String(error)}`)
    }

    public async getFlightInfo(ident: string, params?: AeroAPIQueryParams) : Promise<AeroAPIFlightsResponse> {
        return this.request<AeroAPIFlightsResponse>(`/flights/${ident}`, params);
    }

    public async getAllAirportFlights(airportId: string, params?: AeroAPIAirportFlightParams) : Promise<AeroAPIFlightsResponse> {
        return this.request<AeroAPIFlightsResponse>(`/airports/${airportId}/flights/`, params)
    }

    public async getAirportArrivals(airportId: string, params?: AeroAPIAirportFlightParams) : Promise<AeroAPIFlightsResponse> {
        return this.request<AeroAPIFlightsResponse>(`/airports/${airportId}/flights/arrivals`, params)
    }
    public async getAirportDepartures(airportId: string, params?: AeroAPIAirportFlightParams) : Promise<AeroAPIFlightsResponse> {
        return this.request<AeroAPIFlightsResponse>(`/airports/${airportId}/flights/departures`, params)
    }

    public async getFlightsBetween(origin: string, destination: string, params?: AeroAPIQueryParams) : Promise<AeroAPIFlightsResponse> {
        return this.request<AeroAPIFlightsResponse>(`/flights/search/origin/${origin}/destination/${destination}`, params)
    }

    public async getRoutesBetweenTwoAirports(origin: string, destination: string, params?: AeroAPIQueryParams) : Promise<AeroAPIRoutesResponse> {
        return this.request<AeroAPIRoutesResponse>(`/airports/${origin}/routes/${destination}`, params)
    }

    public async getAirportInfo(airportId: string) : Promise<AeroAPIAirportInfo> {
        return this.request<AeroAPIAirportInfo>(`/airports/${airportId}`);
    }
}