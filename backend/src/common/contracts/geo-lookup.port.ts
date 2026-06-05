import type { Airport } from "../../geo/entities/Airport";
import type { Airline } from "../../geo/entities/Airline";

/**
 * Application contract for resolving geo reference data (airports, airlines).
 * Owned by `common`; implemented by the geo module. City-break and flights
 * depend on this port instead of importing geo.service directly.
 */
export interface GeoLookupPort {
  findAirport(code: string): Promise<Airport | null>;
  findAirline(code: string): Promise<Airline | null>;
}
