import { Repository } from "typeorm";
import { Point } from "geojson";
import { AppDataSource } from "../common/database/data-source";
import { Airport } from "./entities/Airport";
import { Airline } from "./entities/Airline";
import { AirportRoute } from "./entities/AirportRoute";
import { City } from "./entities/City";
import { Country } from "./entities/Country";

export interface RouteEntry {
  airline: AirlineDTO;
  destinations: AirportDTO[];
}

export interface AirportRoutesResult {
  routes: RouteEntry[];
  stale: boolean;
}

export interface AirportDTO {
  icaoCode: string;
  iataCode: string | null;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  city: {
    id: number;
    name: string;
    countryCode: string;
    countryName: string | null;
  } | null;
}

export interface AirlineDTO {
  icaoCode: string;
  iataCode: string | null;
  name: string;
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

export interface AirlineCreateInput {
  icaoCode: string;
  iataCode?: string | null;
  name: string;
}

export interface AirlineUpdateInput {
  iataCode?: string | null;
  name?: string;
}

export interface DirectRouteDTO {
  airlineIcao: string | null;
  airlineIata: string | null;
  airlineName: string | null;
}

export interface ConnectingRouteDTO {
  stopAirportIcao: string;
  stopAirportIata: string | null;
  stopAirportName: string | null;
  stopCityName: string | null;
  stopLatitude: number;
  stopLongitude: number;
}

export interface RouteCheckResult {
  originIcao: string;
  destinationIcao: string;
  direct: DirectRouteDTO[];
  connecting: ConnectingRouteDTO[];
}

// Błędy współdzielone z kanoniczną hierarchią `common/errors` (HttpError).
// Wcześniej moduł geo definiował własne `NotFoundError`/`BadRequestError`
// (z polem `statusCode`), kolidujące nazwą z klasami w `common/errors`.
// Re-eksport eliminuje tę kolizję, zachowując dotychczasowe miejsca użycia
// (`new NotFoundError(...)`, `new UpstreamError(...)` w serwisach geo).
export {
  NotFoundError,
  BadRequestError,
  BadGatewayError as UpstreamError,
} from "../common/errors/http-errors";

export function airportRepo(): Repository<Airport> {
  return AppDataSource.getRepository(Airport);
}
export function airlineRepo(): Repository<Airline> {
  return AppDataSource.getRepository(Airline);
}
export function airportRouteRepo(): Repository<AirportRoute> {
  return AppDataSource.getRepository(AirportRoute);
}
export function cityRepo(): Repository<City> {
  return AppDataSource.getRepository(City);
}
export function countryRepo(): Repository<Country> {
  return AppDataSource.getRepository(Country);
}

export function normalizeIcao(code: string): string {
  return code.trim().toUpperCase();
}

export function hasDbCode(err: unknown): err is { code: unknown } {
  return typeof err === "object" && err !== null && "code" in err;
}

export function makePoint(latitude: number, longitude: number): Point {
  return { type: "Point", coordinates: [longitude, latitude] };
}

export function extractCoordinates(location: Point | null | undefined): {
  latitude: number;
  longitude: number;
} {
  if (!location || !Array.isArray(location.coordinates)) {
    return { latitude: 0, longitude: 0 };
  }
  const [longitude, latitude] = location.coordinates;
  return { latitude, longitude };
}

export function serializeAirport(airport: Airport): AirportDTO {
  const { latitude, longitude } = extractCoordinates(airport.location);
  return {
    icaoCode: airport.icaoCode,
    iataCode: airport.iataCode,
    name: airport.name,
    latitude,
    longitude,
    timezone: airport.timezone,
    city: airport.city
      ? {
          id: airport.city.id,
          name: airport.city.name,
          countryCode: airport.city.countryCode,
          countryName: airport.city.country?.name ?? null,
        }
      : null,
  };
}

export function serializeAirline(airline: Airline): AirlineDTO {
  return {
    icaoCode: airline.icaoCode,
    iataCode: airline.iataCode,
    name: airline.name,
  };
}
