import {getAeroApiClient} from "../common/integrations/aeroapi";
import {getOpenSkyClient, BoundingBox, StateVectorTuple} from "../common/integrations/opensky";
import {BoundingBoxAreaQuery, LocateFlightQuery, LocateFlightResponseDTO, MapFlightSummaryDTO} from "./telemetry.dto";
import {AppDataSource} from "../common/database/data-source";
import {Flight} from "../flights/entities/Flight";
import {FlightTelemetry} from "../telemetry/entities/FlightTelemetry";
import {DataSource} from "typeorm";
import {BoundingBoxLimitError} from "./telemetry.errors";


export class TelemetryService {
    private readonly aeroClient = getAeroApiClient();
    private readonly openSkyClient = getOpenSkyClient();
    private readonly dataSource: DataSource;

    // Spatial buffer 1.5 degrees (~166 km)
    private static readonly SPATIAL_BUFFER_DEGREES = 1.5;

    // Area limit (in square degrees) to secure API credit usage (max 3 credits per request to OpenSky API)
    private static readonly MAX_AREA_SQ_DEGREES = 400;

    constructor(dataSource: DataSource = AppDataSource) {
        this.dataSource = dataSource;
    }

    /**
     * @param faFlightId - external id from AeroAPI
     * @param atcIdent - optional Air Traffic Control callsign, prioritized over ident_icao
     */
    public async locateAndSaveFlight(faFlightId: string, atcIdent?: string | null) : Promise<LocateFlightResponseDTO | null> {

        const flightResponse = await this.aeroClient.getFlightPosition(faFlightId);


        if (!flightResponse) {
            throw new Error(`No response from AeroAPI about the position of ${faFlightId}`);
        }

        const currentPosition = flightResponse.last_position;

        if (!currentPosition || currentPosition.latitude === null || currentPosition.longitude === null) {
            throw new Error(`No active spatial data (last_position) for ${faFlightId}.`)
        }

        // Identifier Precedence (ATC ident > AeroAPI ICAO)
        const targetCallsign = atcIdent || flightResponse.ident_icao;

        if (!targetCallsign) {
            throw new Error(`Netiher ATC Ident nor AeroAPI ICAO code was resolved. OpenSky mapping is impossible.`);
        }

        const boundingBox: BoundingBox = {
            lamin: Math.max(currentPosition.latitude - TelemetryService.SPATIAL_BUFFER_DEGREES, -90),
            lamax: Math.min(currentPosition.latitude + TelemetryService.SPATIAL_BUFFER_DEGREES, 90),
            lomin: Math.max(currentPosition.longitude - TelemetryService.SPATIAL_BUFFER_DEGREES, -180),
            lomax: Math.min(currentPosition.longitude + TelemetryService.SPATIAL_BUFFER_DEGREES, 180),
        }

        // Request to OpenSky Network API

        const stateVectors = await this.openSkyClient.getAllStateVectors(boundingBox);

        if (!stateVectors.states || stateVectors.states.length === 0) {
            return null;
        }

        const normalizedTargetCallsign = targetCallsign.trim().toUpperCase();

        const matchedState = stateVectors.states.find(state => {
            const currentCallsign = state[1]; // idx 1 is callsign
            if (!currentCallsign) return false;
            return currentCallsign.trim().toUpperCase() === normalizedTargetCallsign;
        })

        if (!matchedState) {
            return null;
        }

        return this.saveTelemetryToDatabase(matchedState, faFlightId);
    }

    public async getFlightsInArea(query: BoundingBoxAreaQuery) : Promise<MapFlightSummaryDTO[]> {

        const latRange = query.lamax - query.lamin;
        const lonRange = query.lomax - query.lomin;
        const areaSqDegrees = latRange * lonRange;

        if (areaSqDegrees > TelemetryService.MAX_AREA_SQ_DEGREES) {
            throw new BoundingBoxLimitError(`Requested map area (${areaSqDegrees.toFixed(2)}) sq° exceeded allowed limit ${TelemetryService.MAX_AREA_SQ_DEGREES} sq°`)
        }

        const bbox: BoundingBox = {
            lamin: query.lamin,
            lamax: query.lamax,
            lomin: query.lomin,
            lomax: query.lomax,
        }


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
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                altitude: state[7] ?? null,
                velocity: state[9] ?? null,
                heading: state[10] ?? null,
                onGround: state[8]
            });
        }
        return mapFlights;
    }

    private async saveTelemetryToDatabase(
        stateVector: StateVectorTuple, faFlightId: string
    ): Promise<LocateFlightResponseDTO> {

        const flightRepository = this.dataSource.getRepository(Flight);
        const telemetryRepository = this.dataSource.getRepository(FlightTelemetry);

        // Identity Mapping
        const flightRecord = await flightRepository.findOne({
            where: {faFlightId: faFlightId},
            select: ['id']
        });

        if (!flightRecord) {
            throw new Error(`Flight with AeroAPI Id ${faFlightId} doesn't exist in the main domain.`)
        }

        const icao24 = stateVector[0];
        const longitude = stateVector[5];
        const latitude = stateVector[6];

        if (longitude === null || latitude === null) {
            throw new BoundingBoxLimitError(`State vector (icao24: ${icao24}) does not contain valid coordinates.`)
        }

        const telemetryEntry = telemetryRepository.create({
            icao24: icao24,
            flightId: flightRecord.id,
            timestamp: new Date(),
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            altitude: stateVector[7] ?? null,
            velocity: stateVector[9] ?? null,
            heading: stateVector[10] ?? null,
            onGround: stateVector[8]
        });

        await telemetryRepository.save(telemetryEntry)

        return {
            icao24: telemetryEntry.icao24,
            faFlightId: faFlightId,
            internalFlightId: telemetryEntry.flightId,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            persistedAt: telemetryEntry.timestamp.toISOString()
        }
    }
}