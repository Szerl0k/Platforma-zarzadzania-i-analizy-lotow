import { Repository, ILike, In } from "typeorm";
import { Point } from "geojson";
import { AppDataSource } from "../common/database/data-source";
import { Airport } from "./entities/Airport";
import { Airline } from "./entities/Airline";
import { AirportRoute } from "./entities/AirportRoute";
import { City } from "./entities/City";
import { Country } from "./entities/Country";
import {
  getAeroApiClient,
  AeroAPIError,
  AeroAPIAirportInfo,
  AeroAPIOperatorInfo,
} from "../common/integrations/aeroapi";

export interface RouteEntry {
  airline: AirlineDTO;
  destinations: AirportDTO[];
}

export interface AirportRoutesResult {
  routes: RouteEntry[];
  stale: boolean;
}

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
function airportRouteRepo(): Repository<AirportRoute> {
  return AppDataSource.getRepository(AirportRoute);
}
function cityRepo(): Repository<City> {
  return AppDataSource.getRepository(City);
}
function countryRepo(): Repository<Country> {
  return AppDataSource.getRepository(Country);
}

function getRoutesDbTtlMs(): number {
  const days = parseInt(process.env.ROUTES_DB_TTL_DAYS ?? "7", 10);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60 * 1000;
}

function normalizeIcao(code: string): string {
  return code.trim().toUpperCase();
}

function hasDbCode(err: unknown): err is { code: unknown } {
  return typeof err === "object" && err !== null && "code" in err;
}

function makePoint(latitude: number, longitude: number): Point {
  return { type: "Point", coordinates: [longitude, latitude] };
}

function extractCoordinates(location: Point | null | undefined): {
  latitude: number;
  longitude: number;
} {
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

async function findOrCreateCity(
  countryCode: string,
  cityName: string,
): Promise<City> {
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
  } catch (err: unknown) {
    if (hasDbCode(err) && err.code === "23505") {
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
    where: [{ icaoCode: normalized }, { iataCode: normalized }],
    relations: ["city", "city.country"],
  });
}

async function fetchAirportFromAeroApi(
  code: string,
): Promise<AeroAPIAirportInfo | null> {
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

function resolveAirportCodes(info: AeroAPIAirportInfo): {
  icao: string;
  iata: string | null;
} {
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

async function persistAirportFromAeroApi(
  info: AeroAPIAirportInfo,
): Promise<Airport> {
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
  } catch (err: unknown) {
    if (!hasDbCode(err) || err.code !== "23505") throw err;
  }

  const reloaded = await airportRepo().findOne({
    where: { icaoCode: icao },
    relations: ["city", "city.country"],
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

export async function searchAirports(
  q: string,
  limit = 20,
): Promise<Airport[]> {
  const term = q.trim();
  if (!term) return [];
  const normalized = normalizeIcao(term);
  const like = `%${term}%`;
  return airportRepo()
    .createQueryBuilder("airport")
    .leftJoinAndSelect("airport.city", "city")
    .leftJoinAndSelect("city.country", "country")
    .where("airport.icao_code = :normalized", { normalized })
    .orWhere("airport.iata_code = :normalized", { normalized })
    .orWhere("airport.name ILIKE :like", { like })
    .orWhere("city.name ILIKE :like", { like })
    .orderBy("airport.name", "ASC")
    .take(Math.min(Math.max(limit, 1), 100))
    .getMany();
}

export async function listAirports(
  limit = 50,
  offset = 0,
): Promise<{ items: Airport[]; total: number }> {
  const [items, total] = await airportRepo().findAndCount({
    relations: ["city", "city.country"],
    take: Math.min(Math.max(limit, 1), 200),
    skip: Math.max(offset, 0),
    order: { icaoCode: "ASC" },
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
    .createQueryBuilder("airport")
    .leftJoinAndSelect("airport.city", "city")
    .leftJoinAndSelect("city.country", "country")
    .where(
      "ST_Within(airport.location, ST_MakeEnvelope(:lomin, :lamin, :lomax, :lamax, 4326))",
      { lomin, lamin, lomax, lamax },
    )
    .take(Math.min(Math.max(limit, 1), 500))
    .getMany();
}

export async function createAirport(
  input: AirportCreateInput,
): Promise<Airport> {
  const icao = normalizeIcao(input.icaoCode);
  if (!icao || icao.length < 3 || icao.length > 4) {
    throw new BadRequestError("icaoCode must be 3-4 characters");
  }
  if (!input.name?.trim()) {
    throw new BadRequestError("name is required");
  }
  if (
    typeof input.latitude !== "number" ||
    typeof input.longitude !== "number"
  ) {
    throw new BadRequestError("latitude and longitude are required numbers");
  }
  if (!input.timezone?.trim()) {
    throw new BadRequestError("timezone is required");
  }
  if (!input.countryCode?.trim() || !input.cityName?.trim()) {
    throw new BadRequestError("countryCode and cityName are required");
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
    relations: ["city", "city.country"],
  });
  return reloaded!;
}

export async function updateAirport(
  code: string,
  input: AirportUpdateInput,
): Promise<Airport> {
  const icao = normalizeIcao(code);
  const airport = await airportRepo().findOne({
    where: { icaoCode: icao },
    relations: ["city", "city.country"],
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
    airport.location = makePoint(
      input.latitude ?? latitude,
      input.longitude ?? longitude,
    );
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
    relations: ["city", "city.country"],
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

async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const task = tasks[i++];
      await task().catch(() => {});
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );
}

const routesCache = new Map<
  string,
  { data: RouteEntry[]; stale: boolean; expiresAt: number }
>();
const routesInFlight = new Map<string, Promise<AirportRoutesResult>>();
const ROUTES_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2h

function setCachedRoutes(
  icao: string,
  data: RouteEntry[],
  stale: boolean,
): void {
  routesCache.set(icao, {
    data,
    stale,
    expiresAt: Date.now() + ROUTES_CACHE_TTL_MS,
  });
}

async function getDbRouteFreshness(
  icao: string,
): Promise<{ hasRoutes: boolean; isFresh: boolean }> {
  const row = await airportRouteRepo()
    .createQueryBuilder("ar")
    .select("MAX(ar.fetchedAt)", "maxFetchedAt")
    .where("ar.originAirportCode = :icao", { icao })
    .getRawOne<{ maxFetchedAt: string | null }>();

  const maxFetchedAt = row?.maxFetchedAt ? new Date(row.maxFetchedAt) : null;
  if (!maxFetchedAt) return { hasRoutes: false, isFresh: false };

  const isFresh = maxFetchedAt.getTime() > Date.now() - getRoutesDbTtlMs();
  return { hasRoutes: true, isFresh };
}

async function buildRoutesFromDb(icao: string): Promise<RouteEntry[]> {
  const rows = await airportRouteRepo()
    .createQueryBuilder("ar")
    .innerJoinAndSelect("ar.airline", "airline")
    .innerJoinAndSelect("ar.destinationAirport", "dest")
    .leftJoinAndSelect("dest.city", "city")
    .leftJoinAndSelect("city.country", "country")
    .where("ar.originAirportCode = :icao", { icao })
    .getMany();

  const byAirline = new Map<
    string,
    { airline: Airline; destinations: Airport[] }
  >();
  for (const row of rows) {
    if (!byAirline.has(row.airlineCode)) {
      byAirline.set(row.airlineCode, {
        airline: row.airline,
        destinations: [],
      });
    }
    byAirline.get(row.airlineCode)!.destinations.push(row.destinationAirport);
  }

  const result: RouteEntry[] = [];
  for (const { airline, destinations } of byAirline.values()) {
    result.push({
      airline: serializeAirline(airline),
      destinations: destinations.map(serializeAirport),
    });
  }
  return result.sort((a, b) => a.airline.name.localeCompare(b.airline.name));
}

async function persistRoutesToDb(
  icao: string,
  routeMap: Map<string, Set<string>>,
  airlineMap: Map<string, Airline>,
  airportMap: Map<string, Airport>,
): Promise<void> {
  const fetchedAt = new Date();
  const repo = airportRouteRepo();

  const toInsert: {
    originAirportCode: string;
    airlineCode: string;
    destinationAirportCode: string;
    fetchedAt: Date;
  }[] = [];

  for (const [airlineIcao, destSet] of routeMap) {
    if (!airlineMap.has(airlineIcao)) continue;
    for (const destIcao of destSet) {
      if (!airportMap.has(destIcao)) continue;
      toInsert.push({
        originAirportCode: icao,
        airlineCode: airlineIcao,
        destinationAirportCode: destIcao,
        fetchedAt,
      });
    }
  }

  await repo.delete({ originAirportCode: icao });
  if (toInsert.length > 0) {
    await repo.insert(toInsert);
  }
}

async function fetchRoutesFromAeroApi(icao: string): Promise<RouteEntry[]> {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 14);
  const dateStart = today.toISOString().slice(0, 10);
  const dateEnd = end.toISOString().slice(0, 10);

  let rawSchedules: {
    actual_ident_icao?: string | null;
    destination_icao?: string | null;
    destination?: string | null;
  }[] = [];

  try {
    const response = await getAeroApiClient().getScheduledFlights(
      dateStart,
      dateEnd,
      { origin: icao, max_pages: 10 },
    );
    rawSchedules = (response.scheduled ?? []) as typeof rawSchedules;
  } catch (err) {
    if (err instanceof AeroAPIError && err.status === 404) return [];
    if (err instanceof AeroAPIError && err.status === 429) {
      throw new UpstreamError(
        "Przekroczono limit zapytań AeroAPI. Spróbuj ponownie za chwilę.",
      );
    }
    throw err;
  }

  const routeMap = new Map<string, Set<string>>();
  for (const s of rawSchedules) {
    const opIcao = s.actual_ident_icao?.match(/^([A-Z]{3})/)?.[1];
    const destCode = (s.destination_icao ?? s.destination)
      ?.trim()
      .toUpperCase();
    if (!opIcao || !destCode || destCode === icao) continue;

    if (!routeMap.has(opIcao)) routeMap.set(opIcao, new Set());
    routeMap.get(opIcao)!.add(destCode);
  }

  const allOpIcaos = [...routeMap.keys()];
  const allDestCodes = [
    ...new Set([...routeMap.values()].flatMap((s) => [...s])),
  ];

  const [dbAirlines, dbAirports] = await Promise.all([
    airlineRepo().find({ where: { icaoCode: In(allOpIcaos) } }),
    airportRepo().find({
      where: { icaoCode: In(allDestCodes) },
      relations: ["city", "city.country"],
    }),
  ]);

  const airlineMap = new Map<string, Airline>(
    dbAirlines.map((a) => [a.icaoCode, a]),
  );
  const airportMap = new Map<string, Airport>(
    dbAirports.map((a) => [a.icaoCode, a]),
  );

  const missingAirlines = allOpIcaos.filter((c) => !airlineMap.has(c));
  const missingAirports = allDestCodes.filter((c) => !airportMap.has(c));

  await runConcurrent(
    [
      ...missingAirlines.map(
        (c) => () =>
          getOrFetchAirline(c)
            .then((a) => airlineMap.set(c, a))
            .catch(() => {}),
      ),
      ...missingAirports.map(
        (c) => () =>
          getOrFetchAirport(c)
            .then((a) => airportMap.set(c, a))
            .catch(() => {}),
      ),
    ],
    5,
  );

  await persistRoutesToDb(icao, routeMap, airlineMap, airportMap);

  const result: RouteEntry[] = [];
  for (const [opIcao, destSet] of routeMap) {
    const airline = airlineMap.get(opIcao);
    if (!airline) continue;

    const destinations = [...destSet]
      .map((code) => airportMap.get(code))
      .filter((a): a is Airport => !!a);

    if (destinations.length > 0) {
      result.push({
        airline: serializeAirline(airline),
        destinations: destinations.map(serializeAirport),
      });
    }
  }

  result.sort((a, b) => a.airline.name.localeCompare(b.airline.name));
  return result;
}

async function resolveRoutes(icao: string): Promise<AirportRoutesResult> {
  const { hasRoutes, isFresh } = await getDbRouteFreshness(icao);

  if (hasRoutes && isFresh) {
    const routes = await buildRoutesFromDb(icao);
    setCachedRoutes(icao, routes, false);
    return { routes, stale: false };
  }

  try {
    const routes = await fetchRoutesFromAeroApi(icao);
    setCachedRoutes(icao, routes, false);
    return { routes, stale: false };
  } catch (err) {
    if (hasRoutes && err instanceof UpstreamError) {
      const routes = await buildRoutesFromDb(icao);
      setCachedRoutes(icao, routes, true);
      return { routes, stale: true };
    }
    throw err;
  }
}

export async function getAirportRoutes(
  code: string,
): Promise<AirportRoutesResult> {
  const icao = normalizeIcao(code);

  const cached = routesCache.get(icao);
  if (cached && cached.expiresAt > Date.now()) {
    return { routes: cached.data, stale: cached.stale };
  }

  const inFlight = routesInFlight.get(icao);
  if (inFlight) return inFlight;

  const promise = resolveRoutes(icao).finally(() =>
    routesInFlight.delete(icao),
  );
  routesInFlight.set(icao, promise);
  return promise;
}

export async function findAirlineInDb(code: string): Promise<Airline | null> {
  const normalized = normalizeIcao(code);
  return airlineRepo().findOne({
    where: [{ icaoCode: normalized }, { iataCode: normalized }],
  });
}

async function fetchOperatorFromAeroApi(
  code: string,
): Promise<AeroAPIOperatorInfo | null> {
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

async function persistAirlineFromAeroApi(
  info: AeroAPIOperatorInfo,
): Promise<Airline> {
  const icao = normalizeIcao(info.icao);
  const airline = airlineRepo().create({
    icaoCode: icao,
    iataCode: info.iata ? info.iata.toUpperCase() : null,
    name: info.name,
  });

  try {
    await airlineRepo().save(airline);
  } catch (err: unknown) {
    if (!hasDbCode(err) || err.code !== "23505") throw err;
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

export async function searchAirlines(
  q: string,
  limit = 20,
): Promise<Airline[]> {
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
    order: { name: "ASC" },
  });
}

export async function listAirlines(
  limit = 50,
  offset = 0,
): Promise<{ items: Airline[]; total: number }> {
  const [items, total] = await airlineRepo().findAndCount({
    take: Math.min(Math.max(limit, 1), 200),
    skip: Math.max(offset, 0),
    order: { icaoCode: "ASC" },
  });
  return { items, total };
}

export async function createAirline(
  input: AirlineCreateInput,
): Promise<Airline> {
  const icao = normalizeIcao(input.icaoCode);
  if (!icao || icao.length !== 3) {
    throw new BadRequestError("icaoCode must be exactly 3 characters");
  }
  if (!input.name?.trim()) {
    throw new BadRequestError("name is required");
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

export async function updateAirline(
  code: string,
  input: AirlineUpdateInput,
): Promise<Airline> {
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
