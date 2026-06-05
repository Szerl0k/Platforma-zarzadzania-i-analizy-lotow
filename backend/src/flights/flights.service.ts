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
import { Flight } from "./entities/Flight";
import type { FlightLookupPort } from "../common/contracts/flight-lookup.port";
import type { GeoLookupPort } from "../common/contracts/geo-lookup.port";
import {
  resolveService,
  PORT_TOKENS,
} from "../common/contracts/service-registry";

const FULL_FLIGHT_RELATIONS = [
  "status",
  "origin",
  "origin.city",
  "origin.city.country",
  "destination",
  "destination.city",
  "destination.city.country",
  "operatingAirline",
  "codeshares",
];

/**
 * Service handling commercial flight operations, including integration with AeroAPI
 * and database persistence via FlightsRepository.
 */
export class FlightsService implements FlightLookupPort {
  private readonly dataSource: DataSource;
  private readonly flightsRepository: FlightsRepository;
  private readonly aeroClient = getAeroApiClient();
  private readonly geoOverride?: GeoLookupPort;

  constructor(
    dataSource: DataSource = AppDataSource,
    flightsRepository: FlightsRepository = new FlightsRepository(dataSource),
    geo?: GeoLookupPort,
  ) {
    this.dataSource = dataSource;
    this.flightsRepository = flightsRepository;
    this.geoOverride = geo;
  }

  /**
   * Geo reference data via the GeoLookupPort contract (composition root, or
   * injected in tests) so flights does not import geo.service directly.
   */
  private get geo(): GeoLookupPort {
    return (
      this.geoOverride ?? resolveService<GeoLookupPort>(PORT_TOKENS.GeoLookup)
    );
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
      const airline = await this.geo.findAirline(iataPrefix);
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
    return FlightUtils.mapToDTO(
      reloadedFlight!,
      "database",
    ) as FlightDetailsResponseDTO;
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
    return FlightUtils.mapToDTO(
      reloadedFlight!,
      "database",
    ) as FlightDetailsResponseDTO;
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
    return FlightUtils.mapToDTO(flight, "database") as FlightDetailsResponseDTO;
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
   * Finds flights locally in the database matching the identifier and optionally a specific date range.
   */
  public async findFlightsLocally(
    ident: string,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<FlightDetailsResponseDTO[]> {
    const normalizedIdent = await this.normalizeIdent(ident);

    const flights = await this.flightsRepository.findFlightsByIdentAndDateRange(
      normalizedIdent,
      startDateStr,
      endDateStr,
    );

    return flights
      .map((f) => FlightUtils.mapToDTO(f, "database"))
      .filter((dto): dto is FlightDetailsResponseDTO => dto !== null);
  }

  /**
   * Synchronizes flights from AeroAPI for a specific identifier and date range.
   * If the range is exactly "today", it uses the /flights endpoint for real-time data.
   * Otherwise, it utilizes the /schedules endpoint for broader historical/future coverage.
   */
  public async syncFlightsFromAeroApi(
    ident: string,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<FlightDetailsResponseDTO[]> {
    const normalizedIdent = await this.normalizeIdent(ident);

    const actualStartDateStr =
      startDateStr || new Date().toISOString().split("T")[0];
    const actualEndDateStr = endDateStr || actualStartDateStr;

    const todayStr = new Date().toISOString().split("T")[0];

    // Determine if we should use the Schedules endpoint (historical/future)
    // vs the Flights endpoint (real-time/recent +/- 2 days).
    const isTodayOnly =
      actualStartDateStr === todayStr && actualEndDateStr === todayStr;

    if (!isTodayOnly) {
      const parsed = FlightUtils.parseIdent(normalizedIdent);
      if (parsed) {
        const response = await this.aeroClient.getScheduledFlights(
          actualStartDateStr,
          actualEndDateStr,
          {
            airline: parsed.airline,
            flight_number: parsed.flightNumber,
            max_pages: 1,
          },
        );

        if (!response.scheduled || response.scheduled.length === 0) {
          return [];
        }

        const savedFlights: FlightDetailsResponseDTO[] = [];
        for (const schedule of response.scheduled) {
          const flight = await this.persistAeroSchedule(schedule);
          const dto = FlightUtils.mapToDTO(flight, "AeroAPI");
          if (dto) {
            savedFlights.push(dto);
          }
        }
        return savedFlights;
      }
    }

    const startRange = new Date(`${actualStartDateStr}T00:00:00Z`);
    const endRange = new Date(`${actualEndDateStr}T23:59:59Z`);

    const response: AeroAPIStandardFlightsResponse =
      await this.aeroClient.getFlightInfo(normalizedIdent, {
        start: FlightUtils.formatAeroDate(startRange),
        end: FlightUtils.formatAeroDate(endRange),
        max_pages: 1,
      });

    if (!response.flights || response.flights.length === 0) {
      return [];
    }

    const savedFlights: FlightDetailsResponseDTO[] = [];
    for (const flightDetails of response.flights) {
      const flight = await this.persistAeroFlight(flightDetails);
      const dto = FlightUtils.mapToDTO(flight, "AeroAPI");
      if (dto) {
        savedFlights.push(dto);
      }
    }

    return savedFlights;
  }

  /**
   * Persists an AeroAPI schedule payload into the database.
   */
  private async persistAeroSchedule(
    schedule: any, // AeroAPISchedule
  ): Promise<Flight> {
    return this.dataSource.transaction(async (manager) => {
      const status = await this.flightsRepository.findOrCreateStatus(
        "Scheduled",
        manager,
      );

      const flightData: UpdateFlightDTO = {
        identIcao: schedule.ident_icao || schedule.ident,
        identIata: schedule.ident_iata,
        operatingAirlineIcao: schedule.ident_icao
          ? schedule.ident_icao.substring(0, 3)
          : null,
        callsign:
          schedule.actual_ident || schedule.ident_icao || schedule.ident,
        faFlightId: schedule.fa_flight_id || null,
        originIcao: schedule.origin_icao || null,
        destinationIcao: schedule.destination_icao || null,
        statusId: status.id,
        scheduledOut: schedule.scheduled_out,
        scheduledIn: schedule.scheduled_in,
      };

      let flightRecord: Flight | null = null;
      if (schedule.fa_flight_id) {
        flightRecord = await this.flightsRepository.findByFaFlightId(
          schedule.fa_flight_id,
          FULL_FLIGHT_RELATIONS,
          manager,
        );
      }

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

      return (await this.flightsRepository.findById(
        flightRecord.id,
        FULL_FLIGHT_RELATIONS,
        manager,
      ))!;
    });
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
      FULL_FLIGHT_RELATIONS,
    );

    if (existingFlight) {
      const timeSinceUpdate = Date.now() - existingFlight.updatedAt.getTime();
      if (timeSinceUpdate < FlightUtils.CACHE_DURATION_MS) {
        return FlightUtils.mapToDTO(
          existingFlight,
          "database",
        ) as FlightDetailsResponseDTO;
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
    const flight = await this.persistAeroFlight(flightDetails);
    return FlightUtils.mapToDTO(flight, "AeroAPI") as FlightDetailsResponseDTO;
  }

  /**
   * Fetches a flight from AeroAPI by its `fa_flight_id` and persists it (create-or-update).
   * Used as a second-chance ingestion path when telemetry locate finds a `faFlightId`
   * that has no corresponding row in the `flights` table.
   *
   * @param faFlightId - AeroAPI unique flight identifier.
   * @returns The persisted Flight entity, or null if AeroAPI returned no matching flight.
   */
  /**
   * Looks up a persisted flight by its AeroAPI flight id without hitting the
   * external API. Part of the FlightLookupPort contract.
   */
  public async findByFaFlightId(faFlightId: string): Promise<Flight | null> {
    return this.flightsRepository.findByFaFlightId(faFlightId);
  }

  public async ingestByFaFlightId(faFlightId: string): Promise<Flight | null> {
    let response: AeroAPIStandardFlightsResponse;
    try {
      response = await this.aeroClient.getFlightInfo(faFlightId);
    } catch {
      return null;
    }
    if (!response.flights || response.flights.length === 0) {
      return null;
    }
    return this.persistAeroFlight(response.flights[0]);
  }

  /**
   * Persists an AeroAPI flight payload (create-or-update by `fa_flight_id`) inside a
   * single transaction, syncs codeshares, and returns the reloaded Flight with relations.
   */
  private async persistAeroFlight(
    flightDetails: AeroAPIFlightDetails,
  ): Promise<Flight> {
    return this.dataSource.transaction(async (manager) => {
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
        FULL_FLIGHT_RELATIONS,
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

      if (flightDetails.codeshares_iata?.length) {
        await this.flightsRepository.syncCodeshares(
          flightRecord.id,
          flightDetails.codeshares_iata,
          manager,
        );
      }

      return (await this.flightsRepository.findById(
        flightRecord.id,
        FULL_FLIGHT_RELATIONS,
        manager,
      ))!;
    });
  }
}
