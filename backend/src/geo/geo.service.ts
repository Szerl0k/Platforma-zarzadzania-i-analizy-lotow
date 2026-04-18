import { Repository, ILike } from 'typeorm';
import { Point } from 'geojson';
import { AppDataSource } from '../common/database/data-source';
import { Airport } from './entities/Airport';
import { Airline } from './entities/Airline';
import { City } from './entities/City';
import { Country } from './entities/Country';
import {
    getAeroApiClient,
    AeroAPIError,
    AeroAPIAirportInfo,
    AeroAPIOperatorInfo,
} from '../common/integrations/aeroapi';

export interface AirportDTO {
    icaoCode: string;
    iataCode: string | null;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    city: {
        id: number;
        name: string;
        countryCode: string;
        countryName: string | null;
    } | null;
}

export interface AirlineDTO {
    icaoCode: string;
    iataCode: string | null;
    name: string;
}

export interface AirportCreateInput {
    icaoCode: string;
    iataCode?: string | null;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
    cityName: string;
}

export interface AirportUpdateInput {
    iataCode?: string | null;
    name?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    countryCode?: string;
    cityName?: string;
}

export interface AirlineCreateInput {
    icaoCode: string;
    iataCode?: string | null;
    name: string;
}

export interface AirlineUpdateInput {
    iataCode?: string | null;
    name?: string;
}

export class NotFoundError extends Error {
    statusCode = 404;
    constructor(message: string) {
        super(message);
    }
}

export class BadRequestError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
    }
}

export class UpstreamError extends Error {
    statusCode = 502;
    constructor(message: string) {
        super(message);
    }
}


function airportRepo(): Repository<Airport> {
    return AppDataSource.getRepository(Airport);
}
function airlineRepo(): Repository<Airline> {
    return AppDataSource.getRepository(Airline);
}
function cityRepo(): Repository<City> {
    return AppDataSource.getRepository(City);
}
function countryRepo(): Repository<Country> {
    return AppDataSource.getRepository(Country);
}

function normalizeIcao(code: string): string {
    return code.trim().toUpperCase();
}

function makePoint(latitude: number, longitude: number): Point {
    return { type: 'Point', coordinates: [longitude, latitude] };
}

function extractCoordinates(location: Point | null | undefined): { latitude: number; longitude: number } {
    if (!location || !Array.isArray(location.coordinates)) {
        return { latitude: 0, longitude: 0 };
    }
    const [longitude, latitude] = location.coordinates;
    return { latitude, longitude };
}

export function serializeAirport(airport: Airport): AirportDTO {
    const { latitude, longitude } = extractCoordinates(airport.location);
    return {
        icaoCode: airport.icaoCode,
        iataCode: airport.iataCode,
        name: airport.name,
        latitude,
        longitude,
        timezone: airport.timezone,
        city: airport.city
            ? {
                  id: airport.city.id,
                  name: airport.city.name,
                  countryCode: airport.city.countryCode,
                  countryName: airport.city.country?.name ?? null,
              }
            : null,
    };
}

export function serializeAirline(airline: Airline): AirlineDTO {
    return {
        icaoCode: airline.icaoCode,
        iataCode: airline.iataCode,
        name: airline.name,
    };
}

async function findOrCreateCity(countryCode: string, cityName: string): Promise<City> {
    const code = countryCode.trim().toUpperCase();
    const name = cityName.trim();

    const country = await countryRepo().findOne({ where: { isoCode: code } });
    if (!country) {
        throw new BadRequestError(`Unknown country code "${code}"`);
    }

    const existing = await cityRepo().findOne({
        where: { countryCode: code, name },
    });
    if (existing) return existing;

    const city = cityRepo().create({ countryCode: code, name });
    try {
        return await cityRepo().save(city);
    } catch (err: any) {
        if (err?.code === '23505') {
            const refetched = await cityRepo().findOne({
                where: { countryCode: code, name },
            });
            if (refetched) return refetched;
        }
        throw err;
    }
}

export async function findAirportInDb(code: string): Promise<Airport | null> {
    const normalized = normalizeIcao(code);
    return airportRepo().findOne({
        where: [
            { icaoCode: normalized },
            { iataCode: normalized },
        ],
        relations: ['city', 'city.country'],
    });
}

async function fetchAirportFromAeroApi(code: string): Promise<AeroAPIAirportInfo | null> {
    try {
        return await getAeroApiClient().getAirportInfo(code);
    } catch (err) {
        if (err instanceof AeroAPIError && err.status === 404) {
            return null;
        }
        if (err instanceof AeroAPIError) {
            throw new UpstreamError(`AeroAPI failed: ${err.message}`);
        }
        throw err;
    }
}

function resolveAirportCodes(info: AeroAPIAirportInfo): { icao: string; iata: string | null } {
    const primary = normalizeIcao(info.airport_code);
    const alt = info.alternate_ident ? normalizeIcao(info.alternate_ident) : null;

    if (primary.length === 4) {
        return { icao: primary, iata: alt && alt.length === 3 ? alt : null };
    }
    if (primary.length === 3 && alt && alt.length === 4) {
        return { icao: alt, iata: primary };
    }
    return { icao: primary, iata: alt };
}

async function persistAirportFromAeroApi(info: AeroAPIAirportInfo): Promise<Airport> {
    const { icao, iata } = resolveAirportCodes(info);
    const city = await findOrCreateCity(info.country_code, info.city);

    const airport = airportRepo().create({
        icaoCode: icao,
        iataCode: iata,
        name: info.name,
        cityId: city.id,
        location: makePoint(info.latitude, info.longitude),
        timezone: info.timezone,
    });

    try {
        await airportRepo().save(airport);
    } catch (err: any) {
        if (err?.code !== '23505') throw err;
    }

    const reloaded = await airportRepo().findOne({
        where: { icaoCode: icao },
        relations: ['city', 'city.country'],
    });
    if (!reloaded) {
        throw new Error(`Airport ${icao} disappeared after insert`);
    }
    return reloaded;
}

export async function getOrFetchAirport(code: string): Promise<Airport> {
    const local = await findAirportInDb(code);
    if (local) return local;

    const remote = await fetchAirportFromAeroApi(code);
    if (!remote) {
        throw new NotFoundError(`Airport "${code}" not found in DB or AeroAPI`);
    }

    return persistAirportFromAeroApi(remote);
}

export async function searchAirports(q: string, limit = 20): Promise<Airport[]> {
    const term = q.trim();
    if (!term) return [];
    const normalized = normalizeIcao(term);
    const like = `%${term}%`;
    return airportRepo().find({
        where: [
            { icaoCode: normalized },
            { iataCode: normalized },
            { name: ILike(like) },
        ],
        relations: ['city', 'city.country'],
        take: Math.min(Math.max(limit, 1), 100),
        order: { name: 'ASC' },
    });
}

export async function listAirports(limit = 50, offset = 0): Promise<{ items: Airport[]; total: number }> {
    const [items, total] = await airportRepo().findAndCount({
        relations: ['city', 'city.country'],
        take: Math.min(Math.max(limit, 1), 200),
        skip: Math.max(offset, 0),
        order: { icaoCode: 'ASC' },
    });
    return { items, total };
}

export async function listAirportsInArea(
    lomin: number,
    lamin: number,
    lomax: number,
    lamax: number,
    limit = 300,
): Promise<Airport[]> {
    return airportRepo()
        .createQueryBuilder('airport')
        .leftJoinAndSelect('airport.city', 'city')
        .leftJoinAndSelect('city.country', 'country')
        .where(
            'ST_Within(airport.location, ST_MakeEnvelope(:lomin, :lamin, :lomax, :lamax, 4326))',
            { lomin, lamin, lomax, lamax },
        )
        .take(Math.min(Math.max(limit, 1), 500))
        .getMany();
}

export async function createAirport(input: AirportCreateInput): Promise<Airport> {
    const icao = normalizeIcao(input.icaoCode);
    if (!icao || icao.length < 3 || icao.length > 4) {
        throw new BadRequestError('icaoCode must be 3-4 characters');
    }
    if (!input.name?.trim()) {
        throw new BadRequestError('name is required');
    }
    if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
        throw new BadRequestError('latitude and longitude are required numbers');
    }
    if (!input.timezone?.trim()) {
        throw new BadRequestError('timezone is required');
    }
    if (!input.countryCode?.trim() || !input.cityName?.trim()) {
        throw new BadRequestError('countryCode and cityName are required');
    }

    const existing = await airportRepo().findOne({ where: { icaoCode: icao } });
    if (existing) {
        throw new BadRequestError(`Airport ${icao} already exists`);
    }

    const city = await findOrCreateCity(input.countryCode, input.cityName);
    const airport = airportRepo().create({
        icaoCode: icao,
        iataCode: input.iataCode ? input.iataCode.toUpperCase() : null,
        name: input.name.trim(),
        cityId: city.id,
        location: makePoint(input.latitude, input.longitude),
        timezone: input.timezone,
    });

    await airportRepo().save(airport);

    const reloaded = await airportRepo().findOne({
        where: { icaoCode: icao },
        relations: ['city', 'city.country'],
    });
    return reloaded!;
}

export async function updateAirport(code: string, input: AirportUpdateInput): Promise<Airport> {
    const icao = normalizeIcao(code);
    const airport = await airportRepo().findOne({
        where: { icaoCode: icao },
        relations: ['city', 'city.country'],
    });
    if (!airport) {
        throw new NotFoundError(`Airport ${icao} not found`);
    }

    if (input.iataCode !== undefined) {
        airport.iataCode = input.iataCode ? input.iataCode.toUpperCase() : null;
    }
    if (input.name !== undefined) airport.name = input.name.trim();
    if (input.timezone !== undefined) airport.timezone = input.timezone;
    if (input.latitude !== undefined || input.longitude !== undefined) {
        const { latitude, longitude } = extractCoordinates(airport.location);
        airport.location = makePoint(input.latitude ?? latitude, input.longitude ?? longitude);
    }
    if (input.countryCode !== undefined || input.cityName !== undefined) {
        const targetCountry = input.countryCode ?? airport.city.countryCode;
        const targetCity = input.cityName ?? airport.city.name;
        const city = await findOrCreateCity(targetCountry, targetCity);
        airport.cityId = city.id;
    }

    await airportRepo().save(airport);

    const reloaded = await airportRepo().findOne({
        where: { icaoCode: icao },
        relations: ['city', 'city.country'],
    });
    return reloaded!;
}

export async function deleteAirport(code: string): Promise<void> {
    const icao = normalizeIcao(code);
    const result = await airportRepo().delete({ icaoCode: icao });
    if (!result.affected) {
        throw new NotFoundError(`Airport ${icao} not found`);
    }
}

export async function findAirlineInDb(code: string): Promise<Airline | null> {
    const normalized = normalizeIcao(code);
    return airlineRepo().findOne({
        where: [
            { icaoCode: normalized },
            { iataCode: normalized },
        ],
    });
}

async function fetchOperatorFromAeroApi(code: string): Promise<AeroAPIOperatorInfo | null> {
    try {
        return await getAeroApiClient().getOperatorInfo(code);
    } catch (err) {
        if (err instanceof AeroAPIError && err.status === 404) {
            return null;
        }
        if (err instanceof AeroAPIError) {
            throw new UpstreamError(`AeroAPI failed: ${err.message}`);
        }
        throw err;
    }
}

async function persistAirlineFromAeroApi(info: AeroAPIOperatorInfo): Promise<Airline> {
    const icao = normalizeIcao(info.icao);
    const airline = airlineRepo().create({
        icaoCode: icao,
        iataCode: info.iata ? info.iata.toUpperCase() : null,
        name: info.name,
    });

    try {
        await airlineRepo().save(airline);
    } catch (err: any) {
        if (err?.code !== '23505') throw err;
    }

    const reloaded = await airlineRepo().findOne({ where: { icaoCode: icao } });
    if (!reloaded) {
        throw new Error(`Airline ${icao} disappeared after insert`);
    }
    return reloaded;
}

export async function getOrFetchAirline(code: string): Promise<Airline> {
    const local = await findAirlineInDb(code);
    if (local) return local;

    const remote = await fetchOperatorFromAeroApi(code);
    if (!remote) {
        throw new NotFoundError(`Airline "${code}" not found in DB or AeroAPI`);
    }

    return persistAirlineFromAeroApi(remote);
}

export async function searchAirlines(q: string, limit = 20): Promise<Airline[]> {
    const term = q.trim();
    if (!term) return [];
    const normalized = normalizeIcao(term);
    const like = `%${term}%`;

    return airlineRepo().find({
        where: [
            { icaoCode: normalized },
            { iataCode: normalized },
            { name: ILike(like) },
        ],
        take: Math.min(Math.max(limit, 1), 100),
        order: { name: 'ASC' },
    });
}

export async function listAirlines(limit = 50, offset = 0): Promise<{ items: Airline[]; total: number }> {
    const [items, total] = await airlineRepo().findAndCount({
        take: Math.min(Math.max(limit, 1), 200),
        skip: Math.max(offset, 0),
        order: { icaoCode: 'ASC' },
    });
    return { items, total };
}

export async function createAirline(input: AirlineCreateInput): Promise<Airline> {
    const icao = normalizeIcao(input.icaoCode);
    if (!icao || icao.length !== 3) {
        throw new BadRequestError('icaoCode must be exactly 3 characters');
    }
    if (!input.name?.trim()) {
        throw new BadRequestError('name is required');
    }

    const existing = await airlineRepo().findOne({ where: { icaoCode: icao } });
    if (existing) {
        throw new BadRequestError(`Airline ${icao} already exists`);
    }

    const airline = airlineRepo().create({
        icaoCode: icao,
        iataCode: input.iataCode ? input.iataCode.toUpperCase() : null,
        name: input.name.trim(),
    });
    return airlineRepo().save(airline);
}

export async function updateAirline(code: string, input: AirlineUpdateInput): Promise<Airline> {
    const icao = normalizeIcao(code);
    const airline = await airlineRepo().findOne({ where: { icaoCode: icao } });
    if (!airline) {
        throw new NotFoundError(`Airline ${icao} not found`);
    }

    if (input.iataCode !== undefined) {
        airline.iataCode = input.iataCode ? input.iataCode.toUpperCase() : null;
    }
    if (input.name !== undefined) airline.name = input.name.trim();

    return airlineRepo().save(airline);
}

export async function deleteAirline(code: string): Promise<void> {
    const icao = normalizeIcao(code);
    const result = await airlineRepo().delete({ icaoCode: icao });
    if (!result.affected) {
        throw new NotFoundError(`Airline ${icao} not found`);
    }
}
