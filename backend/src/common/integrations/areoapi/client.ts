import axios, {AxiosInstance} from 'axios';

import {
    AeroAPIQueryParams,
    AeroAPIAirportFlightParams,
    AeroAPIAirportInfo,
    AeroAPIStandardFlightsResponse,
    AeroAPIFlightsBetweenParams, AeroAPISegmentedFlightsResponse, AeroAPISchedulesParams, AeroAPISchedulesResponse,
    AeroAPIOperatorInfo
} from './types'

export class AeroAPIError extends Error {
    public readonly status: number | null;
    public readonly endpoint: string;
    public readonly responseBody: unknown;

    constructor(message: string, endpoint: string, status: number | null, responseBody: unknown) {
        super(message);
        this.name = 'AeroAPIError';
        this.endpoint = endpoint;
        this.status = status;
        this.responseBody = responseBody;
    }
}

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
            this.handleAxiosError(error, endpoint);
        }
    }

    private handleAxiosError(error: unknown, endpoint: string): never {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status ?? null;
            const responseBody = error.response?.data ?? null;
            const message = `AeroAPI request failed for ${endpoint} | Status: ${status ?? 'unknown'} | ${error.message}`;
            throw new AeroAPIError(message, endpoint, status, responseBody);
        }
        throw new AeroAPIError(
            `AeroAPI request failed for ${endpoint} | Unexpected error: ${String(error)}`,
            endpoint,
            null,
            null,
        );
    }

    public async getFlightInfo(ident: string, params?: AeroAPIQueryParams) : Promise<AeroAPIStandardFlightsResponse> {
        return this.request<AeroAPIStandardFlightsResponse>(`/flights/${ident}`, params);
    }

    public async getAllAirportFlights(airportId: string, params?: AeroAPIAirportFlightParams) : Promise<AeroAPIStandardFlightsResponse> {
        return this.request<AeroAPIStandardFlightsResponse>(`/airports/${airportId}/flights`, params)
    }

    public async getAirportArrivals(airportId: string, params?: AeroAPIAirportFlightParams) : Promise<AeroAPIStandardFlightsResponse> {
        return this.request<AeroAPIStandardFlightsResponse>(`/airports/${airportId}/flights/arrivals`, params)
    }
    public async getAirportDepartures(airportId: string, params?: AeroAPIAirportFlightParams) : Promise<AeroAPIStandardFlightsResponse> {
        return this.request<AeroAPIStandardFlightsResponse>(`/airports/${airportId}/flights/departures`, params)
    }

    public async getFlightsBetween(
        origin: string,
        destination: string,
        params?: AeroAPIFlightsBetweenParams
    ) : Promise<AeroAPISegmentedFlightsResponse> {
        return this.request<AeroAPISegmentedFlightsResponse>(`/airports/${origin}/flights/to/${destination}`, params)
    }

    public async getAirportInfo(airportId: string) : Promise<AeroAPIAirportInfo> {
        return this.request<AeroAPIAirportInfo>(`/airports/${airportId}`);
    }

    public async getOperatorInfo(operatorId: string) : Promise<AeroAPIOperatorInfo> {
        return this.request<AeroAPIOperatorInfo>(`/operators/${operatorId}`);
    }

    public async getScheduledFlights(
        dateStart: string,
        dateEnd: string,
        params?: AeroAPISchedulesParams
    ) : Promise<AeroAPISchedulesResponse> {
        return this.request<AeroAPISchedulesResponse>(`/schedules/${dateStart}/${dateEnd}`, params);
    }

}
