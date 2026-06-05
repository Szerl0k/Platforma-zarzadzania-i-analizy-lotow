import type { FlightDetailsResponseDTO } from "../../flights/flights.dto";
import type { Flight } from "../../flights/entities/Flight";

export interface FlightPath {
  traveled: unknown;
  remaining: unknown;
}

/**
 * Application contract for reading/ingesting commercial flight data. Owned by
 * `common`; implemented by the flights module. Modules that need flight data
 * (telemetry, tracking) depend on this port instead of importing FlightsService.
 *
 * Note: the DTO/entity types are imported `type`-only — they are erased at
 * compile time and create no runtime coupling between modules.
 */
export interface FlightLookupPort {
  searchFlight(ident: string): Promise<FlightDetailsResponseDTO>;
  getFlightDetailsAndSave(ident: string): Promise<FlightDetailsResponseDTO>;
  getFlightPath(id: string): Promise<FlightPath>;
  ingestByFaFlightId(faFlightId: string): Promise<Flight | null>;
  findByFaFlightId(faFlightId: string): Promise<Flight | null>;
}
