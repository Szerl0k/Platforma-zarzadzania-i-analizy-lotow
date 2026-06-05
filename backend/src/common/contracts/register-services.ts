import { registerService, PORT_TOKENS } from "./service-registry";
import { FlightsService } from "../../flights/flights.service";
import { findAirportInDb, findAirlineInDb } from "../../geo/geo.service";
import type { FlightLookupPort } from "./flight-lookup.port";
import type { GeoLookupPort } from "./geo-lookup.port";

let registered = false;

/**
 * Composition root: wires concrete domain services to the application ports.
 * This is the *only* place allowed to import services across module boundaries —
 * the modules themselves depend solely on the contracts in `common/contracts`.
 *
 * Implementations are memoised and created lazily on first resolve, so this can
 * be called before the database connection is initialised (the services only
 * touch the connection when their methods run).
 *
 * Must be called once during startup.
 */
export function registerServices(): void {
  if (registered) return;
  registered = true;

  let flights: FlightLookupPort | null = null;
  registerService(PORT_TOKENS.FlightLookup, () => {
    flights ??= new FlightsService();
    return flights;
  });

  const geo: GeoLookupPort = {
    findAirport: (code) => findAirportInDb(code),
    findAirline: (code) => findAirlineInDb(code),
  };
  registerService(PORT_TOKENS.GeoLookup, () => geo);
}
