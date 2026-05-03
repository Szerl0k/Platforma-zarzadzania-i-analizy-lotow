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
import { Flight } from "../flights/entities/Flight";
import { FlightTelemetry } from "../telemetry/entities/FlightTelemetry";
import { DataSource } from "typeorm";
import { BoundingBoxLimitError } from "./telemetry.errors";
import { FlightNotFoundError, TelemetryNotFoundError } from "../common/errors";
import { FlightsService } from "../flights/flights.service";

export class TelemetryService {
  private readonly aeroClient = getAeroApiClient();
  private readonly openSkyClient = getOpenSkyClient();
  private readonly flightsService: FlightsService;
  private readonly dataSource: DataSource;

  // Spatial buffer 1.5 degrees (~166 km)
  private static readonly SPATIAL_BUFFER_DEGREES = 1.5;

  // Area limit (in square degrees) to secure API credit usage (max 3 credits per request to OpenSky API)
  private static readonly MAX_AREA_SQ_DEGREES = 400;

  constructor(dataSource: DataSource = AppDataSource) {
    this.dataSource = dataSource;
    this.flightsService = new FlightsService(dataSource);
  }

  /**
   * @param query - object containing faFlightId and/or icao24
   * @param atcIdent - optional Air Traffic Control callsign, prioritized over ident_icao
   */
  public async locateAndSaveFlight(
    query: LocateFlightQuery,
    atcIdent?: string | null,
  ): Promise<LocateFlightResponseDTO> {
    let matchedState: StateVectorTuple | undefined;
    let resolvedFaFlightId: string | undefined = query.faFlightId;

    // STRATEGY 1: ICAO24 Direct Lookup (User clicked plane on map)
    if (query.icao24) {
      const stateVectors = await this.openSkyClient.getAllStateVectors(
        undefined,
        query.icao24,
      );

      if (stateVectors.states && stateVectors.states.length > 0) {
        matchedState = stateVectors.states[0];

        // If we only have icao24, we must resolve the flight using the callsign from OpenSky
        if (!resolvedFaFlightId) {
          const callsign = matchedState[1]?.trim();
          if (!callsign) {
            throw new TelemetryNotFoundError(
              `Could not resolve callsign for aircraft ${query.icao24} from OpenSky.`,
            );
          }

          // Fetch or sync flight details to get faFlightId
          const flightDetails = await this.flightsService.getFlightDetailsAndSave(callsign);
          resolvedFaFlightId = flightDetails.faFlightId || undefined;
        }
      } else if (!resolvedFaFlightId) {
        // If icao24 lookup failed and we don't have faFlightId to fall back on, throw error
        throw new TelemetryNotFoundError(
          `No active state vector found for aircraft ${query.icao24}.`,
        );
      }
    }

    // STRATEGY 2: faFlightId Spatial Lookup (User clicked flight from a list/AeroAPI)
    if (!matchedState && resolvedFaFlightId) {
      const flightResponse = await this.aeroClient.getFlightPosition(resolvedFaFlightId);

      if (!flightResponse) {
        throw new TelemetryNotFoundError(
          `No response from AeroAPI about the position of ${resolvedFaFlightId}`,
        );
      }

      const currentPosition = flightResponse.last_position;

      if (
        !currentPosition ||
        currentPosition.latitude === null ||
        currentPosition.longitude === null
      ) {
        throw new TelemetryNotFoundError(
          `No active spatial data (last_position) for ${resolvedFaFlightId}.`,
        );
      }

      // Identifier Precedence (ATC ident > AeroAPI ICAO)
      const targetCallsign = atcIdent || flightResponse.ident_icao;

      if (!targetCallsign) {
        throw new TelemetryNotFoundError(
          `Neither ATC Ident nor AeroAPI ICAO code was resolved. OpenSky mapping is impossible.`,
        );
      }

      const boundingBox: BoundingBox = {
        lamin: Math.max(
          currentPosition.latitude - TelemetryService.SPATIAL_BUFFER_DEGREES,
          -90,
        ),
        lamax: Math.min(
          currentPosition.latitude + TelemetryService.SPATIAL_BUFFER_DEGREES,
          90,
        ),
        lomin: Math.max(
          currentPosition.longitude - TelemetryService.SPATIAL_BUFFER_DEGREES,
          -180,
        ),
        lomax: Math.min(
          currentPosition.longitude + TelemetryService.SPATIAL_BUFFER_DEGREES,
          180,
        ),
      };

      const stateVectors = await this.openSkyClient.getAllStateVectors(boundingBox);

      if (!stateVectors.states || stateVectors.states.length === 0) {
        throw new TelemetryNotFoundError(
          `No state vectors found in the defined bounding box for ${resolvedFaFlightId}`,
        );
      }

      const normalizedTargetCallsign = targetCallsign.trim().toUpperCase();

      matchedState = stateVectors.states.find((state) => {
        const currentCallsign = state[1]; // idx 1 is callsign
        if (!currentCallsign) return false;
        return currentCallsign.trim().toUpperCase() === normalizedTargetCallsign;
      });

      if (!matchedState) {
        throw new TelemetryNotFoundError(
          `Could not match callsign ${normalizedTargetCallsign} to any OpenSky state vector`,
        );
      }
    }

    if (!matchedState || !resolvedFaFlightId) {
      throw new TelemetryNotFoundError("Could not resolve flight or state vector.");
    }

    return this.saveTelemetryToDatabase(matchedState, resolvedFaFlightId);
  }

  public async getFlightsInArea(
    query: BoundingBoxAreaQuery,
  ): Promise<MapFlightSummaryDTO[]> {
    const latRange = query.lamax - query.lamin;
    const lonRange = query.lomax - query.lomin;
    const areaSqDegrees = latRange * lonRange;

    if (areaSqDegrees > TelemetryService.MAX_AREA_SQ_DEGREES) {
      throw new BoundingBoxLimitError(
        `Requested map area (${areaSqDegrees.toFixed(2)}) sq° exceeded allowed limit ${TelemetryService.MAX_AREA_SQ_DEGREES} sq°`,
      );
    }

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

    const mapFlights: MapFlightSummaryDTO[] = [];

    for (const state of stateVectors.states) {
      const longitude = state[5];
      const latitude = state[6];

      if (longitude === null || latitude === null) continue;

      mapFlights.push({
        icao24: state[0],
        // Opensky returns callsign with whitespaces
        callsign: state[1] ? state[1].trim() : null,
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        altitude: state[7] ?? null,
        velocity: state[9] ?? null,
        heading: state[10] ?? null,
        onGround: state[8],
      });
    }
    return mapFlights;
  }

  private async saveTelemetryToDatabase(
    stateVector: StateVectorTuple,
    faFlightId: string,
  ): Promise<LocateFlightResponseDTO> {
    const flightRepository = this.dataSource.getRepository(Flight);
    const telemetryRepository = this.dataSource.getRepository(FlightTelemetry);

    // Identity Mapping
    const flightRecord = await flightRepository.findOne({
      where: { faFlightId: faFlightId },
      select: ["id"],
    });

    if (!flightRecord) {
      throw new FlightNotFoundError(
        `Flight with AeroAPI Id ${faFlightId} doesn't exist in the main domain.`,
      );
    }

    const icao24 = stateVector[0];
    const longitude = stateVector[5];
    const latitude = stateVector[6];

    if (longitude === null || latitude === null) {
      throw new BoundingBoxLimitError(
        `State vector (icao24: ${icao24}) does not contain valid coordinates.`,
      );
    }

    const telemetryEntry = telemetryRepository.create({
      icao24: icao24,
      flightId: flightRecord.id,
      timestamp: new Date(),
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      altitude: stateVector[7] != null ? Math.round(stateVector[7]) : null,
      velocity: stateVector[9] ?? null,
      heading: stateVector[10] ?? null,
      onGround: stateVector[8],
    });

    await telemetryRepository.save(telemetryEntry);

    // PostGIS Distance Calculation Logic (refactored to database procedures)
    const [distances] = await this.dataSource.query(
      `
      SELECT 
        ST_Distance(t.location::geography, origin.location::geography) / 1000 as "distanceFromOriginKm",
        ST_Distance(t.location::geography, dest.location::geography) / 1000 as "distanceToDestinationKm"
      FROM flight_telemetry t
      JOIN flights f ON f.id = t.flight_id
      LEFT JOIN airports origin ON origin.icao_code = f.origin_icao
      LEFT JOIN airports dest ON dest.icao_code = f.destination_icao
      WHERE t.id = $1
      `,
      [telemetryEntry.id],
    );

    return {
      icao24: telemetryEntry.icao24,
      faFlightId: faFlightId,
      internalFlightId: telemetryEntry.flightId,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      distanceFromOriginKm: distances?.distanceFromOriginKm ? parseFloat(distances.distanceFromOriginKm) : null,
      distanceToDestinationKm: distances?.distanceToDestinationKm ? parseFloat(distances.distanceToDestinationKm) : null,
      persistedAt: telemetryEntry.timestamp.toISOString(),
    };
  }
}
