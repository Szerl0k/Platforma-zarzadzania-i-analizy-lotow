import axios, { AxiosInstance } from "axios";

import { recordApiCall } from "../usage/recorder";
import {
  AeroAPIQueryParams,
  AeroAPIAirportFlightParams,
  AeroAPIAirportInfo,
  AeroAPIStandardFlightsResponse,
  AeroAPIFlightsBetweenParams,
  AeroAPISegmentedFlightsResponse,
  AeroAPISchedulesParams,
  AeroAPISchedulesResponse,
  AeroAPIOperatorInfo,
  AeroAPIFlightPositionResponse,
} from "./types";

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9._-]{1,64}$/;
const SAFE_DATE_SEGMENT = /^\d{4}-\d{2}-\d{2}$/;

function assertSafePathSegment(value: string, name: string): string {
  if (!SAFE_PATH_SEGMENT.test(value)) {
    throw new Error(`Invalid ${name}: must match ${SAFE_PATH_SEGMENT}`);
  }
  return value;
}

function assertSafeDateSegment(value: string, name: string): string {
  if (!SAFE_DATE_SEGMENT.test(value)) {
    throw new Error(`Invalid ${name}: must be YYYY-MM-DD`);
  }
  return value;
}

export class AeroAPIError extends Error {
  public readonly status: number | null;
  public readonly endpoint: string;
  public readonly responseBody: unknown;

  constructor(
    message: string,
    endpoint: string,
    status: number | null,
    responseBody: unknown,
  ) {
    super(message);
    this.name = "AeroAPIError";
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
      throw new Error("Authorization credentials for AreoAPI are missing");
    }

    this.apiKey = apiKey;
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 15000,
      headers: {
        "x-apikey": this.apiKey,
        Accept: "application/json",
      },
    });
  }

  private async request<T>(
    endpoint: string,
    params?: AeroAPIQueryParams,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const res = await this.httpClient.get<T>(endpoint, { params });
      recordApiCall({
        provider: "aeroapi",
        endpoint,
        statusCode: res.status,
        success: true,
        durationMs: Date.now() - startedAt,
      });
      return res.data;
    } catch (error) {
      const status =
        axios.isAxiosError(error) && typeof error.response?.status === "number"
          ? error.response.status
          : null;
      recordApiCall({
        provider: "aeroapi",
        endpoint,
        statusCode: status,
        success: false,
        durationMs: Date.now() - startedAt,
      });
      this.handleAxiosError(error, endpoint);
    }
  }

  private handleAxiosError(error: unknown, endpoint: string): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? null;
      const responseBody = error.response?.data ?? null;
      const message = `AeroAPI request failed for ${endpoint} | Status: ${status ?? "unknown"} | ${error.message}`;
      throw new AeroAPIError(message, endpoint, status, responseBody);
    }
    throw new AeroAPIError(
      `AeroAPI request failed for ${endpoint} | Unexpected error: ${String(error)}`,
      endpoint,
      null,
      null,
    );
  }

  public async getFlightInfo(
    ident: string,
    params?: AeroAPIQueryParams,
  ): Promise<AeroAPIStandardFlightsResponse> {
    const safeIdent = assertSafePathSegment(ident, "ident");
    return this.request<AeroAPIStandardFlightsResponse>(
      `/flights/${safeIdent}`,
      params,
    );
  }

  public async getAllAirportFlights(
    airportId: string,
    params?: AeroAPIAirportFlightParams,
  ): Promise<AeroAPIStandardFlightsResponse> {
    const safeAirport = assertSafePathSegment(airportId, "airportId");
    return this.request<AeroAPIStandardFlightsResponse>(
      `/airports/${safeAirport}/flights`,
      params,
    );
  }

  public async getAirportArrivals(
    airportId: string,
    params?: AeroAPIAirportFlightParams,
  ): Promise<AeroAPIStandardFlightsResponse> {
    const safeAirport = assertSafePathSegment(airportId, "airportId");
    return this.request<AeroAPIStandardFlightsResponse>(
      `/airports/${safeAirport}/flights/arrivals`,
      params,
    );
  }
  public async getAirportDepartures(
    airportId: string,
    params?: AeroAPIAirportFlightParams,
  ): Promise<AeroAPIStandardFlightsResponse> {
    const safeAirport = assertSafePathSegment(airportId, "airportId");
    return this.request<AeroAPIStandardFlightsResponse>(
      `/airports/${safeAirport}/flights/departures`,
      params,
    );
  }

  public async getFlightsBetween(
    origin: string,
    destination: string,
    params?: AeroAPIFlightsBetweenParams,
  ): Promise<AeroAPISegmentedFlightsResponse> {
    const safeOrigin = assertSafePathSegment(origin, "origin");
    const safeDestination = assertSafePathSegment(destination, "destination");
    return this.request<AeroAPISegmentedFlightsResponse>(
      `/airports/${safeOrigin}/flights/to/${safeDestination}`,
      params,
    );
  }

  public async getAirportInfo(airportId: string): Promise<AeroAPIAirportInfo> {
    const safeAirport = assertSafePathSegment(airportId, "airportId");
    return this.request<AeroAPIAirportInfo>(`/airports/${safeAirport}`);
  }

  public async getOperatorInfo(
    operatorId: string,
  ): Promise<AeroAPIOperatorInfo> {
    const safeOperator = assertSafePathSegment(operatorId, "operatorId");
    return this.request<AeroAPIOperatorInfo>(`/operators/${safeOperator}`);
  }

  public async getScheduledFlights(
    dateStart: string,
    dateEnd: string,
    params?: AeroAPISchedulesParams,
  ): Promise<AeroAPISchedulesResponse> {
    const safeStart = assertSafeDateSegment(dateStart, "dateStart");
    const safeEnd = assertSafeDateSegment(dateEnd, "dateEnd");
    return this.request<AeroAPISchedulesResponse>(
      `/schedules/${safeStart}/${safeEnd}`,
      params,
    );
  }

  public async getFlightPosition(
    faFlightId: string,
  ): Promise<AeroAPIFlightPositionResponse> {
    const safeFlightId = assertSafePathSegment(faFlightId, "faFlightId");
    return this.request<AeroAPIFlightPositionResponse>(
      `/flights/${safeFlightId}/position`,
    );
  }
}
