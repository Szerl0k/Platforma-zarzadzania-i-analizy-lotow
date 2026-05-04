import { Flight } from "./entities/Flight";
import { FlightDetailsResponseDTO } from "./flights.dto";

/**
 * Utility functions for flight data transformations and formatting.
 * These methods are stateless and pure.
 */
export const FlightUtils = {
  /**
   * Duration in milliseconds for which flight details are considered fresh in the database.
   */
  CACHE_DURATION_MS: 5 * 60 * 1000,

  /**
   * Formats a Date object to a strict ISO8601 string without milliseconds,
   * as required by AeroAPI (e.g., 2026-04-15T23:00:00Z).
   *
   * @param date - The Date object to format.
   * @returns Formatted string.
   */
  formatAeroDate(date: Date): string {
    return date.toISOString().split(".")[0] + "Z";
  },

  /**
   * Maps a Flight entity (with its relations) to a FlightDetailsResponseDTO.
   *
   * @param flight - The Flight entity to map.
   * @param source - The data source (database or AeroAPI).
   * @returns A sanitized DTO for the frontend.
   */
  mapToDTO(
    flight: Flight,
    source: "database" | "AeroAPI",
  ): FlightDetailsResponseDTO {
    const isLive = !flight.actualIn;

    return {
      id: flight.id,
      identIcao: flight.identIcao,
      identIata: flight.identIata,
      operatingAirlineIcao: flight.operatingAirlineIcao,
      callsign: flight.callsign,
      faFlightId: flight.faFlightId,
      originIcao: flight.originIcao,
      destinationIcao: flight.destinationIcao,
      statusId: flight.statusId,
      terminalOrigin: flight.terminalOrigin,
      gateOrigin: flight.gateOrigin,
      terminalDestination: flight.terminalDestination,
      gateDestination: flight.gateDestination,
      departureDelay: flight.departureDelay,
      arrivalDelay: flight.arrivalDelay,
      scheduledOut: flight.scheduledOut
        ? flight.scheduledOut.toISOString()
        : null,
      estimatedOut: flight.estimatedOut
        ? flight.estimatedOut.toISOString()
        : null,
      actualOut: flight.actualOut ? flight.actualOut.toISOString() : null,
      scheduledIn: flight.scheduledIn ? flight.scheduledIn.toISOString() : null,
      estimatedIn: flight.estimatedIn ? flight.estimatedIn.toISOString() : null,
      actualIn: flight.actualIn ? flight.actualIn.toISOString() : null,
      status: flight.status
        ? {
            id: flight.status.id,
            name: flight.status.name,
            category: flight.status.category,
          }
        : undefined,
      origin: flight.origin
        ? {
            icaoCode: flight.origin.icaoCode,
            iataCode: flight.origin.iataCode,
            name: flight.origin.name,
            city: flight.origin.city
              ? {
                  name: flight.origin.city.name,
                  countryName: flight.origin.city.country
                    ? flight.origin.city.country.name
                    : null,
                }
              : undefined,
          }
        : null,
      destination: flight.destination
        ? {
            icaoCode: flight.destination.icaoCode,
            iataCode: flight.destination.iataCode,
            name: flight.destination.name,
            city: flight.destination.city
              ? {
                  name: flight.destination.city.name,
                  countryName: flight.destination.city.country
                    ? flight.destination.city.country.name
                    : null,
                }
              : undefined,
          }
        : null,
      operatingAirline: flight.operatingAirline
        ? {
            icaoCode: flight.operatingAirline.icaoCode,
            name: flight.operatingAirline.name,
          }
        : null,
      isLive,
      source,
    };
  },
};
