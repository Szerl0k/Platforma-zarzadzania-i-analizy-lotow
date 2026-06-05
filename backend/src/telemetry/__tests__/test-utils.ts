import { StateVectorTuple } from "../../common/integrations/opensky";
import {
  AeroAPIFlightDetails,
  AeroAPIFlightPositionResponse,
  AeroAPILastPosition,
  AeroAPIStandardFlightsResponse,
} from "../../common/integrations/aeroapi/types";

/**
 * Creates a mock OpenSky StateVectorTuple with sensible defaults.
 */
export const createMockStateVector = (
  overrides: Partial<{
    icao24: string;
    callsign: string | null;
    lon: number | null;
    lat: number | null;
    alt: number | null;
    velocity: number | null;
    heading: number | null;
    onGround: boolean;
    originCountry: string;
    category: number;
  }> = {},
): StateVectorTuple => {
  return [
    overrides.icao24 !== undefined ? overrides.icao24 : "icao123",
    overrides.callsign !== undefined ? overrides.callsign : "CALL123 ",
    overrides.originCountry !== undefined ? overrides.originCountry : "origin",
    0,
    0,
    overrides.lon !== undefined ? overrides.lon : 21.0,
    overrides.lat !== undefined ? overrides.lat : 52.0,
    overrides.alt !== undefined ? overrides.alt : 10000,
    overrides.onGround ?? false,
    overrides.velocity !== undefined ? overrides.velocity : 200,
    overrides.heading !== undefined ? overrides.heading : 90,
    0,
    null,
    null,
    null,
    false,
    0,
    overrides.category !== undefined ? overrides.category : 0,
  ];
};

/**
 * Creates a mock AeroAPI Last Position object.
 */
export const createMockAeroPosition = (
  overrides: Partial<AeroAPILastPosition> = {},
): AeroAPILastPosition => {
  return {
    fa_flight_id: "fa123",
    altitude: 30000,
    latitude: 52.0,
    longitude: 21.0,
    timestamp: new Date().toISOString(),
    ...overrides,
  } as AeroAPILastPosition;
};

/**
 * Creates a mock AeroAPI Flight Position response.
 */
export const createMockAeroFlightPosition = (
  overrides: Partial<AeroAPIFlightPositionResponse> = {},
): AeroAPIFlightPositionResponse => {
  return {
    ident: "AAL123",
    ident_icao: "AAL123",
    ident_iata: "AA123",
    atc_ident: "AAL123",
    fa_flight_id: "fa123",
    last_position: createMockAeroPosition(),
    ...overrides,
  } as AeroAPIFlightPositionResponse;
};

/**
 * Creates a mock AeroAPI Standard Flights response.
 */
export const createMockAeroFlightsResponse = (
  flights: Partial<AeroAPIFlightDetails>[] = [],
): AeroAPIStandardFlightsResponse => {
  return {
    flights: flights.map((f) => ({ ...f }) as AeroAPIFlightDetails),
  } as AeroAPIStandardFlightsResponse;
};
