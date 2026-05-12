import { In } from "typeorm";
import {
  airportRepo,
  airlineRepo,
  airportRouteRepo,
  normalizeIcao,
  extractCoordinates,
  serializeAirport,
  serializeAirline,
  RouteEntry,
  AirportRoutesResult,
  DirectRouteDTO,
  ConnectingRouteDTO,
  RouteCheckResult,
  UpstreamError,
} from "./geo.utils";
import { Airport } from "./entities/Airport";
import { Airline } from "./entities/Airline";
import { getAeroApiClient, AeroAPIError } from "../common/integrations/aeroapi";
import { getOrFetchAirport } from "./geo.airports.service";
import { getOrFetchAirline } from "./geo.airlines.service";

function getRoutesDbTtlMs(): number {
  const days = parseInt(process.env.ROUTES_DB_TTL_DAYS ?? "7", 10);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60 * 1000;
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
const ROUTES_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

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

const routeCheckCache = new Map<
  string,
  { data: RouteCheckResult; expiresAt: number }
>();
const ROUTE_CHECK_TTL_MS = 30 * 60 * 1000;

async function getDirectRoutesFromDb(
  originIcao: string,
  destIcao: string,
): Promise<DirectRouteDTO[]> {
  const rows = await airportRouteRepo()
    .createQueryBuilder("ar")
    .innerJoinAndSelect("ar.airline", "airline")
    .where("ar.originAirportCode = :origin", { origin: originIcao })
    .andWhere("ar.destinationAirportCode = :dest", { dest: destIcao })
    .getMany();

  return rows
    .map((r) => ({
      airlineIcao: r.airline.icaoCode,
      airlineIata: r.airline.iataCode,
      airlineName: r.airline.name,
    }))
    .sort((a, b) => (a.airlineName ?? "").localeCompare(b.airlineName ?? ""));
}

async function getConnectingRoutesFromDb(
  originIcao: string,
  destIcao: string,
): Promise<ConnectingRouteDTO[]> {
  const [leg1, leg2] = await Promise.all([
    airportRouteRepo().find({
      select: { destinationAirportCode: true },
      where: { originAirportCode: originIcao },
    }),
    airportRouteRepo().find({
      select: { originAirportCode: true },
      where: { destinationAirportCode: destIcao },
    }),
  ]);

  const leg1Dests = new Set(leg1.map((r) => r.destinationAirportCode));
  const leg2Origins = new Set(leg2.map((r) => r.originAirportCode));

  const stopCodes = [...leg1Dests].filter(
    (code) => leg2Origins.has(code) && code !== originIcao && code !== destIcao,
  );

  if (stopCodes.length === 0) return [];

  const stopAirports = await airportRepo().find({
    where: { icaoCode: In(stopCodes) },
    relations: ["city"],
  });

  return stopAirports
    .map((a) => {
      const { latitude, longitude } = extractCoordinates(a.location);
      return {
        stopAirportIcao: a.icaoCode,
        stopAirportIata: a.iataCode,
        stopAirportName: a.name,
        stopCityName: a.city?.name ?? null,
        stopLatitude: latitude,
        stopLongitude: longitude,
      };
    })
    .sort((a, b) =>
      (a.stopCityName ?? a.stopAirportName ?? "").localeCompare(
        b.stopCityName ?? b.stopAirportName ?? "",
      ),
    );
}

export async function getRouteCheck(
  originCode: string,
  destinationCode: string,
): Promise<RouteCheckResult> {
  const originIcao = normalizeIcao(originCode);
  const destIcao = normalizeIcao(destinationCode);

  const cacheKey = `${originIcao}:${destIcao}`;
  const cached = routeCheckCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const [direct, connecting] = await Promise.all([
    getDirectRoutesFromDb(originIcao, destIcao),
    getConnectingRoutesFromDb(originIcao, destIcao),
  ]);

  const result: RouteCheckResult = {
    originIcao,
    destinationIcao: destIcao,
    direct,
    connecting,
  };
  routeCheckCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + ROUTE_CHECK_TTL_MS,
  });
  return result;
}
