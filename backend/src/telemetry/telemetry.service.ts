import { getAeroApiClient } from "../common/integrations/aeroapi";
import {
  getOpenSkyClient,
  BoundingBox,
  StateVectorTuple,
} from "../common/integrations/opensky";
import {
  BoundingBoxAreaQuery,
  LocateFlightQuery,
  LocateFlightResponseDTO,
  MapFlightSummaryDTO,
} from "./telemetry.dto";
import { AppDataSource } from "../common/database/data-source";
import { DataSource } from "typeorm";
import { BoundingBoxLimitError } from "./telemetry.errors";
import { FlightNotFoundError, TelemetryNotFoundError } from "../common/errors";
import { FlightsService } from "../flights/flights.service";
import { FlightsRepository } from "../flights/flights.repository";
import { TelemetryUtils } from "./telemetry.utils";
import { TelemetryRepository } from "./telemetry.repository";

/**
 * Service managing flight telemetry data, coordinating between OpenSky (live states),
 * AeroAPI (spatial history/identities), and PostGIS for spatial calculations.
 */
export class TelemetryService {
  private readonly aeroClient = getAeroApiClient();
  private readonly openSkyClient = getOpenSkyClient();
  private readonly flightsService: FlightsService;
  private readonly flightsRepository: FlightsRepository;
  private readonly telemetryRepository: TelemetryRepository;
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource = AppDataSource) {
    this.dataSource = dataSource;
    this.flightsService = new FlightsService(dataSource);
    this.flightsRepository = new FlightsRepository(dataSource);
    this.telemetryRepository = new TelemetryRepository(dataSource);
  }

  /**
   * Locates an active flight using either ICAO24 (transponder) or faFlightId (AeroAPI).
   * Persists the current state to the database and calculates distances to origin/destination.
   *
   * @param query - Lookup parameters (icao24 and/or faFlightId).
   * @param atcIdent - Optional Air Traffic Control callsign, prioritized over ident_icao.
   * @returns Enriched telemetry DTO with distance calculations.
   *
   * @calledBy TelemetryRoutes (GET /telemetry/locate)
   */
  public async locateAndSaveFlight(
    query: LocateFlightQuery,
    atcIdent?: string | null,
  ): Promise<LocateFlightResponseDTO> {
    let matchedState: StateVectorTuple | undefined;
    let resolvedFaFlightId: string | undefined = query.faFlightId;

    // STRATEGY 1: ICAO24 Direct Lookup (User clicked plane on map)
    if (query.icao24) {
      try {
        const { state, faFlightId } = await this.resolveByIcao24(
          query.icao24,
          resolvedFaFlightId,
        );
        matchedState = state;
        resolvedFaFlightId = faFlightId;
      } catch (error) {
        if (!resolvedFaFlightId) throw error;
      }
    }

    // STRATEGY 2: faFlightId Spatial Lookup (User clicked flight from a list/AeroAPI)
    if (!matchedState && resolvedFaFlightId) {
      matchedState = await this.resolveBySpatialMatch(
        resolvedFaFlightId,
        atcIdent,
      );
    }

    if (!matchedState || !resolvedFaFlightId) {
      throw new TelemetryNotFoundError(
        "Could not resolve flight or state vector.",
      );
    }

    return this.persistTelemetry(matchedState, resolvedFaFlightId);
  }

  /**
   * Fetches all active flight states within a given bounding box for map visualization.
   *
   * @param query - Bounding box area coordinates.
   * @returns Array of summarized flight states.
   *
   * @calledBy TelemetryRoutes (GET /telemetry/area)
   */
  public async getFlightsInArea(
    query: BoundingBoxAreaQuery,
  ): Promise<MapFlightSummaryDTO[]> {
    TelemetryUtils.validateAreaLimits(query);

    const bbox: BoundingBox = {
      lamin: query.lamin,
      lamax: query.lamax,
      lomin: query.lomin,
      lomax: query.lomax,
    };

    const stateVectors = await this.openSkyClient.getAllStateVectors(bbox);

    if (!stateVectors.states || stateVectors.states.length === 0) {
      return [];
    }

    return stateVectors.states
      .filter(
        (state): state is StateVectorTuple =>
          state[5] !== null && state[6] !== null,
      )
      .map((state) => ({
        icao24: state[0],
        callsign: state[1] ? state[1].trim() : null,
        location: {
          type: "Point",
          coordinates: [state[5]!, state[6]!],
        },
        altitude: state[7] ?? null,
        velocity: state[9] ?? null,
        heading: state[10] ?? null,
        onGround: state[8],
      }));
  }

  /**
   * Resolves flight state and AeroAPI ID using a direct ICAO24 lookup.
   */
  private async resolveByIcao24(
    icao24: string,
    existingFaFlightId?: string,
  ): Promise<{ state: StateVectorTuple; faFlightId: string }> {
    const stateVectors = await this.openSkyClient.getAllStateVectors(
      undefined,
      icao24,
    );
    const state = stateVectors.states?.[0];

    if (!state) {
      throw new TelemetryNotFoundError(
        `No active state vector found for aircraft ${icao24}.`,
      );
    }

    let faFlightId = existingFaFlightId;
    if (!faFlightId) {
      const callsign = state[1]?.trim();
      if (!callsign) {
        throw new TelemetryNotFoundError(
          `Could not resolve callsign for aircraft ${icao24} from OpenSky.`,
        );
      }

      try {
        const flightDetails =
          await this.flightsService.getFlightDetailsAndSave(callsign);
        faFlightId = flightDetails.faFlightId || undefined;
      } catch (error: unknown) {
        if (error instanceof FlightNotFoundError) {
          throw new TelemetryNotFoundError(
            `Could not resolve AeroAPI ID for aircraft ${icao24}.`,
          );
        }
      }
    }

    if (!faFlightId) {
      throw new TelemetryNotFoundError(
        `Could not resolve AeroAPI ID for aircraft ${icao24}.`,
      );
    }

    return { state, faFlightId };
  }

  /**
   * Resolves flight state by matching AeroAPI's last known position to OpenSky state vectors in a spatial buffer.
   */
  private async resolveBySpatialMatch(
    faFlightId: string,
    atcIdent?: string | null,
  ): Promise<StateVectorTuple> {
    const flightResponse = await this.aeroClient.getFlightPosition(faFlightId);
    const currentPosition = flightResponse?.last_position;

    if (
      !currentPosition ||
      currentPosition.latitude === null ||
      currentPosition.longitude === null
    ) {
      throw new TelemetryNotFoundError(
        `No active spatial data (last_position) for ${faFlightId}.`,
      );
    }

    // Double check atcIdent to avoid codesharing mismatch, as AeroAPI does not return the atcIdent property in getFlightPosition()
    if (atcIdent === undefined) {
      const flightDataResponse =
        await this.aeroClient.getFlightInfo(faFlightId);
      atcIdent =
        flightDataResponse.flights[0].atc_ident !== undefined
          ? flightDataResponse.flights[0].atc_ident
          : null;
    }

    const targetCallsign = (atcIdent || flightResponse.ident_icao)
      ?.trim()
      .toUpperCase();
    if (!targetCallsign) {
      throw new TelemetryNotFoundError(
        `Could not resolve callsign for spatial matching of ${faFlightId}.`,
      );
    }

    const boundingBox = TelemetryUtils.createBoundingBox(
      currentPosition.latitude,
      currentPosition.longitude,
    );
    const stateVectors =
      await this.openSkyClient.getAllStateVectors(boundingBox);

    const match = stateVectors.states?.find(
      (state) => state[1]?.trim().toUpperCase() === targetCallsign,
    );

    if (!match) {
      throw new TelemetryNotFoundError(
        `Could not match callsign ${targetCallsign} to any OpenSky state vector near its last known position.`,
      );
    }

    return match;
  }

  /**
   * Persists a state vector as a telemetry entry and calculates related spatial metrics.
   */
  private async persistTelemetry(
    state: StateVectorTuple,
    faFlightId: string,
  ): Promise<LocateFlightResponseDTO> {
    const flightRecord =
      await this.flightsRepository.findByFaFlightId(faFlightId);

    if (!flightRecord) {
      throw new FlightNotFoundError(
        `Flight with AeroAPI Id ${faFlightId} doesn't exist in the database.`,
      );
    }

    const [
      icao24,
      ,
      ,
      ,
      ,
      longitude,
      latitude,
      altitude,
      onGround,
      velocity,
      heading,
    ] = state;

    if (longitude === null || latitude === null) {
      throw new BoundingBoxLimitError(
        `State vector (icao24: ${icao24}) does not contain valid coordinates.`,
      );
    }

    const telemetryEntry = await this.telemetryRepository.save({
      icao24,
      flightId: flightRecord.id,
      timestamp: new Date(),
      location: { type: "Point", coordinates: [longitude, latitude] },
      altitude: altitude != null ? Math.round(altitude) : null,
      velocity: velocity ?? null,
      heading: heading ?? null,
      onGround,
    });

    const distances = await this.telemetryRepository.calculateDistances(
      telemetryEntry.id,
    );

    return {
      icao24: telemetryEntry.icao24,
      faFlightId,
      internalFlightId: telemetryEntry.flightId,
      location: telemetryEntry.location,
      ...distances,
      persistedAt: telemetryEntry.timestamp.toISOString(),
    };
  }
}
