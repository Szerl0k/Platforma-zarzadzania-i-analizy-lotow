import { In } from "typeorm";
import NodeCache from "node-cache";
import { AppDataSource } from "../common/database/data-source";
import { Airport } from "../geo/entities/Airport";
import {
  getAeroApiClient,
  AeroAPIError,
  AeroAPISchedule,
} from "../common/integrations/aeroapi";
import type { GeoLookupPort } from "../common/contracts/geo-lookup.port";
import {
  resolveService,
  PORT_TOKENS,
} from "../common/contracts/service-registry";
import {
  BadRequestError,
  NotFoundError,
  InternalError,
} from "../common/errors/http-errors";
import { haversineDistanceKm, airportCoords } from "../common/utils/geo";
import {
  SearchCityBreakQuery,
  CityBreakProposalDTO,
  ProposalDetailsDTO,
  ProposalFlightOptionDTO,
  ProposalDetailsQuery,
} from "./city-break.dto";

const SEARCH_CACHE_TTL_S = 15 * 60;
const DETAILS_CACHE_TTL_S = 10 * 60;
const MAX_WINDOW_DAYS = 7;
const MIN_PROPOSALS = 5;
const MAX_PROPOSALS = 50;

const searchCache = new NodeCache({
  stdTTL: SEARCH_CACHE_TTL_S,
  checkperiod: 60,
});
const detailsCache = new NodeCache({
  stdTTL: DETAILS_CACHE_TTL_S,
  checkperiod: 60,
});

interface DestinationAggregate {
  destinationIcao: string;
  minDurationMinutes: number;
  flightCount: number;
  airlines: Set<string>;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function clampWindow(
  dateFrom: string,
  dateTo: string,
): { start: string; end: string } {
  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  const maxEnd = new Date(
    start.getTime() + MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const clampedEnd = end.getTime() > maxEnd.getTime() ? maxEnd : end;
  return {
    start: start.toISOString().slice(0, 10),
    end: clampedEnd.toISOString().slice(0, 10),
  };
}

function durationMinutes(
  scheduledOut: string,
  scheduledIn: string,
): number | null {
  const out = Date.parse(scheduledOut);
  const inMs = Date.parse(scheduledIn);
  if (!Number.isFinite(out) || !Number.isFinite(inMs)) return null;
  const diff = Math.round((inMs - out) / 60000);
  return diff > 0 ? diff : null;
}

async function resolveOriginIcao(
  input: string,
  geo: GeoLookupPort,
): Promise<string> {
  const code = normalizeCode(input);
  if (/^[A-Z]{3,4}$/.test(code)) {
    const direct = await geo.findAirport(code);
    if (direct) return direct.icaoCode;
  }
  // Fall back: maybe user typed the city name — search the DB.
  const repo = AppDataSource.getRepository(Airport);
  const byName = await repo
    .createQueryBuilder("airport")
    .leftJoin("airport.city", "city")
    .where("airport.icao_code = :code", { code })
    .orWhere("airport.iata_code = :code", { code })
    .orWhere("city.name ILIKE :like", { like: input.trim() })
    .orderBy("airport.icao_code", "ASC")
    .getOne();
  if (byName) return byName.icaoCode;
  throw new BadRequestError(`Nie znaleziono lotniska dla "${input}".`);
}

function aggregateByDestination(
  schedules: AeroAPISchedule[],
  originIcao: string,
): Map<string, DestinationAggregate> {
  const out = new Map<string, DestinationAggregate>();
  for (const s of schedules) {
    const dest = (s.destination_icao ?? s.destination)?.trim().toUpperCase();
    if (!dest || dest === originIcao) continue;
    if (!s.scheduled_out || !s.scheduled_in) continue;
    const dur = durationMinutes(s.scheduled_out, s.scheduled_in);
    if (dur === null) continue;
    const airlineCode =
      s.actual_ident_iata?.match(/^[A-Z0-9]{2}/)?.[0] ??
      s.actual_ident_icao?.match(/^[A-Z]{3}/)?.[0] ??
      null;

    const existing = out.get(dest);
    if (existing) {
      existing.flightCount += 1;
      if (dur < existing.minDurationMinutes) existing.minDurationMinutes = dur;
      if (airlineCode) existing.airlines.add(airlineCode);
    } else {
      const airlines = new Set<string>();
      if (airlineCode) airlines.add(airlineCode);
      out.set(dest, {
        destinationIcao: dest,
        minDurationMinutes: dur,
        flightCount: 1,
        airlines,
      });
    }
  }
  return out;
}

async function loadDestinationAirports(
  icaos: string[],
): Promise<Map<string, Airport>> {
  if (icaos.length === 0) return new Map();
  const repo = AppDataSource.getRepository(Airport);
  const rows = await repo.find({
    where: { icaoCode: In(icaos) },
    relations: ["city", "city.country"],
  });
  return new Map(rows.map((a) => [a.icaoCode, a]));
}

function buildProposal(
  agg: DestinationAggregate,
  airport: Airport | undefined,
  originAirport: Airport,
): CityBreakProposalDTO {
  const coords = airport ? airportCoords(airport) : null;
  const originCoords = airportCoords(originAirport);
  const distanceKm =
    coords && originCoords
      ? haversineDistanceKm(
          originCoords.lat,
          originCoords.lon,
          coords.lat,
          coords.lon,
        )
      : null;

  return {
    destinationIcao: agg.destinationIcao,
    destinationIata: airport?.iataCode ?? null,
    cityName: airport?.city?.name ?? null,
    countryName: airport?.city?.country?.name ?? null,
    countryCode: airport?.city?.countryCode ?? null,
    airportName: airport?.name ?? agg.destinationIcao,
    minFlightDurationMinutes: agg.minDurationMinutes,
    flightCount: agg.flightCount,
    airlines: [...agg.airlines].sort(),
    distanceKm,
  };
}

function applyFilters(
  proposals: CityBreakProposalDTO[],
  params: SearchCityBreakQuery,
): CityBreakProposalDTO[] {
  const excludeSet = new Set(params.excludeCountryCodes ?? []);
  return proposals.filter((p) => {
    if (excludeSet.size > 0 && p.countryCode && excludeSet.has(p.countryCode)) {
      return false;
    }
    if (
      typeof params.maxFlightHours === "number" &&
      p.minFlightDurationMinutes > params.maxFlightHours * 60
    ) {
      return false;
    }
    if (
      typeof params.maxDistanceKm === "number" &&
      p.distanceKm !== null &&
      p.distanceKm > params.maxDistanceKm
    ) {
      return false;
    }
    return true;
  });
}

function sortProposals(
  proposals: CityBreakProposalDTO[],
  sortBy: SearchCityBreakQuery["sortBy"],
): CityBreakProposalDTO[] {
  const sorted = [...proposals];
  if (sortBy === "popularity") {
    sorted.sort((a, b) => b.flightCount - a.flightCount);
  } else {
    sorted.sort(
      (a, b) => a.minFlightDurationMinutes - b.minFlightDurationMinutes,
    );
  }
  return sorted;
}

function searchCacheKey(originIcao: string, q: SearchCityBreakQuery): string {
  return [
    originIcao,
    q.dateFrom,
    q.dateTo,
    q.maxFlightHours ?? "",
    q.maxDistanceKm ?? "",
    (q.excludeCountryCodes ?? []).join("|"),
    q.sortBy,
  ].join("::");
}

function detailsCacheKey(q: ProposalDetailsQuery, destIcao: string): string {
  return [normalizeCode(q.origin), destIcao, q.dateFrom, q.dateTo].join("::");
}

function wrapAeroError(err: unknown): never {
  if (err instanceof AeroAPIError) {
    if (err.status === 404) {
      throw new NotFoundError("Brak danych w AeroAPI dla podanych parametrów.");
    }
    if (err.status === 429) {
      throw new InternalError(
        "Przekroczono limit zapytań AeroAPI. Spróbuj ponownie za chwilę.",
      );
    }
    throw new InternalError(`AeroAPI błąd: ${err.message}`);
  }
  throw err;
}

export class CityBreakService {
  private readonly aeroClient = getAeroApiClient();
  private readonly geoOverride?: GeoLookupPort;

  constructor(geo?: GeoLookupPort) {
    this.geoOverride = geo;
  }

  /**
   * Airport resolution via the GeoLookupPort contract (composition root, or
   * injected in tests) so city-break does not import geo.service.
   */
  private get geo(): GeoLookupPort {
    return (
      this.geoOverride ?? resolveService<GeoLookupPort>(PORT_TOKENS.GeoLookup)
    );
  }

  public async searchProposals(
    params: SearchCityBreakQuery,
  ): Promise<CityBreakProposalDTO[]> {
    const originIcao = await resolveOriginIcao(params.origin, this.geo);
    const cacheKey = searchCacheKey(originIcao, params);
    const cached = searchCache.get<CityBreakProposalDTO[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = clampWindow(params.dateFrom, params.dateTo);
    const originAirport = await this.geo.findAirport(originIcao);
    if (!originAirport) {
      throw new NotFoundError(
        `Lotnisko origin ${originIcao} nie znalezione w bazie.`,
      );
    }

    let schedules: AeroAPISchedule[] = [];
    try {
      const response = await this.aeroClient.getScheduledFlights(start, end, {
        origin: originIcao,
        max_pages: 2,
      });
      schedules = response.scheduled ?? [];
    } catch (err) {
      wrapAeroError(err);
    }

    const aggregates = aggregateByDestination(schedules, originIcao);
    const destIcaos = [...aggregates.keys()];
    const airportsByIcao = await loadDestinationAirports(destIcaos);

    const proposals = [...aggregates.values()].map((agg) =>
      buildProposal(
        agg,
        airportsByIcao.get(agg.destinationIcao),
        originAirport,
      ),
    );

    const filtered = applyFilters(proposals, params);
    const sorted = sortProposals(filtered, params.sortBy);
    const limited = sorted.slice(0, MAX_PROPOSALS);

    searchCache.set(cacheKey, limited);
    return limited;
  }

  public async getProposalDetails(
    destinationIcao: string,
    params: ProposalDetailsQuery,
  ): Promise<ProposalDetailsDTO> {
    const destIcao = normalizeCode(destinationIcao);
    const originIcao = await resolveOriginIcao(params.origin, this.geo);
    const cacheKey = detailsCacheKey(params, destIcao);
    const cached = detailsCache.get<ProposalDetailsDTO>(cacheKey);
    if (cached) return cached;

    const { start, end } = clampWindow(params.dateFrom, params.dateTo);

    let schedules: AeroAPISchedule[] = [];
    try {
      const response = await this.aeroClient.getScheduledFlights(start, end, {
        origin: originIcao,
        destination: destIcao,
        max_pages: 1,
      });
      schedules = response.scheduled ?? [];
    } catch (err) {
      wrapAeroError(err);
    }

    const options: ProposalFlightOptionDTO[] = schedules
      .filter((s) => s.scheduled_out && s.scheduled_in)
      .map((s) => {
        const dep = s.scheduled_out;
        const arr = s.scheduled_in;
        const identIcao = s.actual_ident_icao ?? s.ident_icao ?? null;
        const identIata = s.actual_ident_iata ?? s.ident_iata ?? null;
        const airlineIcao = identIcao?.match(/^[A-Z]{3}/)?.[0] ?? null;
        const airlineIata = identIata?.match(/^[A-Z0-9]{2}/)?.[0] ?? null;
        const flightNumber =
          (identIata ?? identIcao ?? s.ident)?.match(/\d+[A-Z]?$/)?.[0] ?? null;
        return {
          airlineIcao,
          airlineIata,
          airlineName: null,
          flightNumber,
          scheduledDeparture: dep,
          scheduledArrival: arr,
          durationMinutes: durationMinutes(dep, arr),
          isDirect: true,
          stops: 0,
        };
      })
      .sort((a, b) => {
        const ta = a.scheduledDeparture ? Date.parse(a.scheduledDeparture) : 0;
        const tb = b.scheduledDeparture ? Date.parse(b.scheduledDeparture) : 0;
        return ta - tb;
      });

    const result: ProposalDetailsDTO = {
      originIcao,
      destinationIcao: destIcao,
      options,
    };
    detailsCache.set(cacheKey, result);
    return result;
  }
}

export const MIN_PROPOSALS_HINT = MIN_PROPOSALS;

export const __testing__ = {
  aggregateByDestination,
  applyFilters,
  sortProposals,
  durationMinutes,
};
