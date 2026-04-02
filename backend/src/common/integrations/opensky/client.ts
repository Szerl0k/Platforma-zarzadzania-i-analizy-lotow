import axios, {AxiosInstance} from 'axios';
import {
    AircraftTimeWindow,
    BoundingBox,
    FlightTimeWindow,
    OpenSkyFlight,
    OpenSkyStateVectorsResponse,
    OpenSkyTrackResponse
} from './types';


export class OpenSkyClient {
    private readonly authUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
    private readonly apiUrl = "https://opensky-network.org/api";

    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly httpClient: AxiosInstance;

    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(clientId: string, clientSecret: string) {
        if (!clientId || !clientSecret) {
            throw new Error('Authorization credentials for OpenSky API are missing');
        }

        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.httpClient = axios.create({
            baseURL: this.apiUrl,
            timeout: 10000,
        })
    }

    private async getAccessToken() : Promise<string> {
        const currentTimestamp = Date.now();

        // Odnów token jeśli wygasa za mniej niz 30 sekund
        if (this.accessToken && this.tokenExpiresAt > currentTimestamp + 30000) {
            return this.accessToken;
        }

        const payload = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
        });

        try {
            const res = await axios.post(
                this.authUrl,
                payload.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });

            this.accessToken = res.data.access_token;
            this.tokenExpiresAt = currentTimestamp + (res.data.expires_in * 1000)

            if (!this.accessToken) {
                throw new Error('Access token is missing in the response')
            }

            return this.accessToken as string;
        } catch (error) {
            this.handleAxiosError(error, 'Failed to retrieve access token from OpenSky API')
        }
    }

    private async request<T>(endpoint: string, params?: Record<string, any>) : Promise<T> {
        const token = await this.getAccessToken();

        try {
            const res = await this.httpClient.get<T>(endpoint, {
                headers : {
                    Authorization: `Bearer ${token}`
                },
                params: params
            });
            return res.data;
        } catch (error) {
            this.handleAxiosError(error, `OpenSky API request fialed for endpoint: ${endpoint}`)
        }
    }

    private handleAxiosError(error: unknown, customMessage: string) : never {
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status || 'Unknown Status';
            const responseData = JSON.stringify(error.response?.data || {});
            throw new Error(`${customMessage} | Status: ${statusCode} | Details: ${responseData} | Message: ${error.message}`)
        }
        throw new Error(`${customMessage} | Unexpected error: ${String(error)}`);
    }

    public async getAllStateVectors(bbox?: BoundingBox, icao24?: string | string[]) : Promise<OpenSkyStateVectorsResponse> {
        const params: Record<string, any> = {};

        if (bbox) {
            params.lamin = bbox.lamin;
            params.lomin = bbox.lomin;
            params.lamax = bbox.lamax;
            params.lomax = bbox.lomax;
        }

        if (icao24) {
            params.icao24 = Array.isArray(icao24) ? icao24.join(',') : icao24;
        }

        return this.request<OpenSkyStateVectorsResponse>('/states/all', params);
    }

    // From OpenSky API documentation:
    // Flights are updated by a batch process at night, i.e., only flights from the previous day or earlier are available using this endpoint.
    public async getArrivalsByAirport(params: FlightTimeWindow) : Promise<OpenSkyFlight[]> {
        return this.request<OpenSkyFlight[]>('/flights/arrival', {
            airport: params.airportICAO,
            begin: params.begin,
            end: params.end
        });
    }

    // From OpenSky API documentation:
    // Flights are updated by a batch process at night, i.e., only flights from the previous day or earlier are available using this endpoint.
    public async getDeparturesByAirport(params: FlightTimeWindow) : Promise<OpenSkyFlight[]> {
        return this.request<OpenSkyFlight[]>('/flights/departure', {
            airport: params.airportICAO,
            begin: params.begin,
            end: params.end
        });
    }

    // From OpenSky API documentation:
    // Flights are updated by a batch process at night, i.e., only flights from the previous day or earlier are available using this endpoint.
    public async getFlightsByAircraft(params: AircraftTimeWindow) : Promise<OpenSkyFlight[]> {
        return this.request<OpenSkyFlight[]>('/flights/aircraft', {
            icao24: params.icao24,
            begin: params.begin,
            end: params.end
        });
    }

    public async getFlightTrajectory(icao24: string, time: number) : Promise<OpenSkyTrackResponse> {
        return this.request<OpenSkyTrackResponse>('/tracks', {
            icao24: icao24.toLowerCase(),
            time: time
        })
    }
}