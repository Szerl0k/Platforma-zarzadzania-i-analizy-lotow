import { AppDataSource } from "../common/database/data-source";
import { DataSource } from "typeorm";
import { getAeroApiClient } from "../common/integrations/aeroapi";
import {
  AeroAPIFlightDetails,
  AeroAPIStandardFlightsResponse,
} from "../common/integrations/aeroapi/types";
import {
  FlightDetailsResponseDTO,
  CreateFlightDTO,
  UpdateFlightDTO,
} from "./flights.dto";
import { FlightNotFoundError } from "../common/errors";
import { FlightsRepository } from "./flights.repository";
import { FlightUtils } from "./flights.utils";
import { findAirlineInDb } from "../geo/geo.service";

/**
 * Service handling commercial flight operations, including integration with AeroAPI
 * and database persistence via FlightsRepository.
 */
export class FlightsService {
  private readonly dataSource: DataSource;
  private readonly flightsRepository: FlightsRepository;
  private readonly aeroClient = getAeroApiClient();

  constructor(
    dataSource: DataSource = AppDataSource,
    flightsRepository: FlightsRepository = new FlightsRepository(dataSource),
  ) {
    this.dataSource = dataSource;
    this.flightsRepository = flightsRepository;
  }

  /**
   * Normalizes a flight identifier (IATA/ICAO) to a standard ICAO identifier.
   * If a 2-character IATA airline prefix is detected, it attempts to resolve
   * the corresponding 3-character ICAO airline code via the GeoService.
   *
   * @param ident - The flight identifier to normalize (e.g., "LH123", "DLH123").
   * @returns The normalized ICAO identifier (e.g., "DLH123").
   */
  private async normalizeIdent(ident: string): Promise<string> {
    const trimmed = ident.trim().toUpperCase();

    // IATA: 2 chars (AlphaNumeric, first must be Alpha) + 1-4 digits + opt letter
    const iataMatch = trimmed.match(/^([A-Z][A-Z0-9])(\d{1,4}[A-Z]?)$/);
    // ICAO: 3 letters + 1-4 digits + opt letter
    const icaoMatch = trimmed.match(/^([A-Z]{3})(\d{1,4}[A-Z]?)$/);

    if (iataMatch && !icaoMatch) {
      const iataPrefix = iataMatch[1];
      const flightNumber = iataMatch[2];
      const airline = await findAirlineInDb(iataPrefix);
      if (airline && airline.icaoCode) {
        return `${airline.icaoCode}${flightNumber}`;
      }
    }
    return trimmed;
  }

  /**
   * Creates a new flight record in the database.
   *
   * @param data - The data required to create a flight.
   * @returns A DTO containing the newly created flight details.
   *
   * @calledBy FlightsRoutes (POST /)
   */
  public async createFlight(
    data: CreateFlightDTO,
  ): Promise<FlightDetailsResponseDTO> {
    const flight = await this.flightsRepository.create(data);
    const reloadedFlight = await this.flightsRepository.findById(flight.id, [
      "status",
      "origin",
      "origin.city",
      "origin.city.country",
      "destination",
      "destination.city",
      "destination.city.country",
      "operatingAirline",
    ]);
    return FlightUtils.mapToDTO(reloadedFlight!, "database");
  }

  /**
   * Updates an existing flight record by its UUID.
   *
   * @param id - The UUID of the flight to update.
   * @param data - Partial data for the update.
   * @returns A DTO containing the updated flight details.
   * @throws {FlightNotFoundError} If the flight does not exist.
   *
   * @calledBy FlightsRoutes (PUT /:id)
   */
  public async updateFlight(
    id: string,
    data: UpdateFlightDTO,
  ): Promise<FlightDetailsResponseDTO> {
    const flight = await this.flightsRepository.update(id, data);
    if (!flight)
      throw new FlightNotFoundError(`Flight with ID ${id} not found`);

    const reloadedFlight = await this.flightsRepository.findById(id, [
      "status",
      "origin",
      "origin.city",
      "origin.city.country",
      "destination",
      "destination.city",
      "destination.city.country",
      "operatingAirline",
    ]);
    return FlightUtils.mapToDTO(reloadedFlight!, "database");
  }

  /**
   * Retrieves a single flight by its UUID with full relations.
   *
   * @param id - The UUID of the flight.
   * @returns A DTO containing flight details.
   * @throws {FlightNotFoundError} If the flight does not exist.
   *
   * @calledBy FlightsRoutes (GET /:id)
   */
  public async getFlightById(id: string): Promise<FlightDetailsResponseDTO> {
    const flight = await this.flightsRepository.findById(id, [
      "status",
      "origin",
      "origin.city",
      "origin.city.country",
      "destination",
      "destination.city",
      "destination.city.country",
      "operatingAirline",
    ]);
    if (!flight)
      throw new FlightNotFoundError(`Flight with ID ${id} not found`);
    return FlightUtils.mapToDTO(flight, "database");
  }

  /**
   * Deletes a flight record from the database.
   *
   * @param id - The UUID of the flight to delete.
   * @throws {FlightNotFoundError} If the flight does not exist.
   *
   * @calledBy FlightsRoutes (DELETE /:id)
   */
  public async deleteFlight(id: string): Promise<void> {
    const success = await this.flightsRepository.delete(id);
    if (!success)
      throw new FlightNotFoundError(`Flight with ID ${id} not found`);
  }

  /**
   * Retrieves the spatial flight path segments (traveled and remaining).
   *
   * @param id - The UUID of the flight.
   * @returns Geometries for the flight segments.
   * @throws {FlightNotFoundError} If the flight path cannot be calculated.
   *
   * @calledBy FlightsRoutes (GET /:id/path)
   */
  public async getFlightPath(
    id: string,
  ): Promise<{ traveled: any; remaining: any }> {
    const path = await this.flightsRepository.getFlightPath(id);
    if (!path.traveled && !path.remaining) {
      throw new FlightNotFoundError(
        `Flight path for ID ${id} cannot be constructed (missing origin/destination)`,
      );
    }
    return path;
  }

  /**
   * Public search method that handles normalization of IATA/ICAO codes.
   *
   * @param ident - Raw flight identifier from user input.
   * @returns Flight details.
   *
   * @calledBy FlightsRoutes (GET /details)
   */
  public async searchFlight(ident: string): Promise<FlightDetailsResponseDTO> {
    const normalizedIdent = await this.normalizeIdent(ident);
    return this.getFlightDetailsAndSave(normalizedIdent);
  }

  /**
   * Orchestrates fetching flight details, prioritizing a local cache before hitting AeroAPI.
   * If a cache miss occurs, it fetches data from AeroAPI and synchronizes it with the local database.
   *
   * @param identIcao - The ICAO identifier or callsign of the flight.
   * @returns A DTO containing commercial flight details.
   * @throws {FlightNotFoundError} If the flight cannot be found in the database or AeroAPI.
   *
   * @calledBy FlightsRoutes (GET /details), TelemetryService (locateAndSaveFlight)
   */
  public async getFlightDetailsAndSave(
    identIcao: string,
  ): Promise<FlightDetailsResponseDTO> {
    // 1. Try to fetch from DB first to check for cache
    const existingFlight = await this.flightsRepository.findByCallsign(
      identIcao,
      [
        "status",
        "origin",
        "origin.city",
        "origin.city.country",
        "destination",
        "destination.city",
        "destination.city.country",
        "operatingAirline",
        "codeshares",
      ],
    );

    if (existingFlight) {
      const timeSinceUpdate = Date.now() - existingFlight.updatedAt.getTime();
      if (timeSinceUpdate < FlightUtils.CACHE_DURATION_MS) {
        return FlightUtils.mapToDTO(existingFlight, "database");
      }
    }

    // 2. Fetch from AeroAPI if cache miss or expired
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const startTimestamp = now - 4 * 60 * 60; // 4 hours ago
    const endTimestamp = now + 4 * 60 * 60; // 4 hours from now

    const response: AeroAPIStandardFlightsResponse =
      await this.aeroClient.getFlightInfo(identIcao, {
        start: FlightUtils.formatAeroDate(new Date(startTimestamp * 1000)),
        end: FlightUtils.formatAeroDate(new Date(endTimestamp * 1000)),
        max_pages: 1,
      });

    if (!response.flights || response.flights.length === 0) {
      throw new FlightNotFoundError(
        `Could find no active flight details in AeroAPI for ICAO code: ${identIcao}`,
      );
    }

    const flightDetails: AeroAPIFlightDetails = response.flights[0];

    // Transaction to ensure consistency
    const flight = await this.dataSource.transaction(async (manager) => {
      const status = await this.flightsRepository.findOrCreateStatus(
        flightDetails.status,
        manager,
      );

      const flightData: UpdateFlightDTO = {
        identIcao: flightDetails.ident_icao || flightDetails.ident,
        identIata: flightDetails.ident_iata,
        operatingAirlineIcao: flightDetails.operator_icao,
        callsign:
          flightDetails.atc_ident ||
          flightDetails.ident_icao ||
          flightDetails.ident,
        faFlightId: flightDetails.fa_flight_id,
        originIcao: flightDetails.origin?.code_icao || null,
        destinationIcao: flightDetails.destination?.code_icao || null,
        statusId: status.id,
        terminalOrigin: flightDetails.terminal_origin,
        gateOrigin: flightDetails.gate_origin,
        terminalDestination: flightDetails.terminal_destination,
        gateDestination: flightDetails.gate_destination,
        departureDelay: flightDetails.departure_delay,
        arrivalDelay: flightDetails.arrival_delay,
        scheduledOut: flightDetails.scheduled_out || null,
        estimatedOut: flightDetails.estimated_out || null,
        actualOut: flightDetails.actual_out || null,
        scheduledIn: flightDetails.scheduled_in || null,
        estimatedIn: flightDetails.estimated_in || null,
        actualIn: flightDetails.actual_in || null,
      };

      let flightRecord = await this.flightsRepository.findByFaFlightId(
        flightDetails.fa_flight_id,
        [
          "status",
          "origin",
          "origin.city",
          "origin.city.country",
          "destination",
          "destination.city",
          "destination.city.country",
          "operatingAirline",
          "codeshares",
        ],
        manager,
      );

      if (!flightRecord) {
        flightRecord = await this.flightsRepository.create(
          flightData as CreateFlightDTO,
          manager,
        );
      } else {
        await this.flightsRepository.update(
          flightRecord.id,
          flightData,
          manager,
        );
      }

      // Handle codeshares
      if (flightDetails.codeshares_iata?.length) {
        await this.flightsRepository.syncCodeshares(
          flightRecord.id,
          flightDetails.codeshares_iata,
          manager,
        );
      }

      // Reload with relations for final DTO mapping
      return (await this.flightsRepository.findById(flightRecord.id, [
        "status",
        "origin",
        "origin.city",
        "origin.city.country",
        "destination",
        "destination.city",
        "destination.city.country",
        "operatingAirline",
        "codeshares",
      ]))!;
    });

    return FlightUtils.mapToDTO(flight, "AeroAPI");
  }
}
