import { In } from "typeorm";
import NodeCache from "node-cache";
import { AppDataSource } from "../common/database/data-source";
import { Airport } from "../geo/entities/Airport";
import {
  getAeroApiClient,
  AeroAPIError,
  AeroAPISchedule,
  AeroAPISegmentedFlight,
} from "../common/integrations/aeroapi";
import { findAirportInDb } from "../geo/geo.service";
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

const searchCache = new NodeCache({ stdTTL: SEARCH_CACHE_TTL_S, checkperiod: 60 });
const detailsCache = new NodeCache({ stdTTL: DETAILS_CACHE_TTL_S, checkperiod: 60 });

interface DestinationAggregate {
  destinationIcao: string;
  minDurationMinutes: number;
  flightCount: number;
  airlines: Set<string>;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function clampWindow(dateFrom: string, dateTo: string): { start: string; end: string } {
  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  const maxEnd = new Date(start.getTime() + MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const clampedEnd = end.getTime() > maxEnd.getTime() ? maxEnd : end;
  return {
    start: start.toISOString().slice(0, 10),
    end: clampedEnd.toISOString().slice(0, 10),
  };
}

function durationMinutes(scheduledOut: string, scheduledIn: string): number | null {
  const out = Date.parse(scheduledOut);
  const inMs = Date.parse(scheduledIn);
  if (!Number.isFinite(out) || !Number.isFinite(inMs)) return null;
  const diff = Math.round((inMs - out) / 60000);
  return diff > 0 ? diff : null;
}

async function resolveOriginIcao(input: string): Promise<string> {
  const code = normalizeCode(input);
  if (/^[A-Z]{3,4}$/.test(code)) {
    const direct = await findAirportInDb(code);
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

  public async searchProposals(
    params: SearchCityBreakQuery,
  ): Promise<CityBreakProposalDTO[]> {
    const originIcao = await resolveOriginIcao(params.origin);
    const cacheKey = searchCacheKey(originIcao, params);
    const cached = searchCache.get<CityBreakProposalDTO[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = clampWindow(params.dateFrom, params.dateTo);
    const originAirport = await findAirportInDb(originIcao);
    if (!originAirport) {
      throw new NotFoundError(`Lotnisko origin ${originIcao} nie znalezione w bazie.`);
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
      buildProposal(agg, airportsByIcao.get(agg.destinationIcao), originAirport),
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
    const originIcao = await resolveOriginIcao(params.origin);
    const cacheKey = detailsCacheKey(params, destIcao);
    const cached = detailsCache.get<ProposalDetailsDTO>(cacheKey);
    if (cached) return cached;

    const { start, end } = clampWindow(params.dateFrom, params.dateTo);

    let segments: AeroAPISegmentedFlight[] = [];
    try {
      const response = await this.aeroClient.getFlightsBetween(
        originIcao,
        destIcao,
        {
          start: `${start}T00:00:00Z`,
          end: `${end}T23:59:59Z`,
          max_pages: 1,
        },
      );
      segments = response.flights ?? [];
    } catch (err) {
      wrapAeroError(err);
    }

    const options: ProposalFlightOptionDTO[] = segments.map((seg) => {
      const segs = seg.segments ?? [];
      const first = segs[0];
      const last = segs[segs.length - 1];
      if (!first || !last) {
        return {
          airlineIcao: null,
          airlineIata: null,
          airlineName: null,
          flightNumber: null,
          scheduledDeparture: null,
          scheduledArrival: null,
          durationMinutes: null,
          isDirect: true,
          stops: 0,
        };
      }
      const dep = first.scheduled_out;
      const arr = last.scheduled_in;
      return {
        airlineIcao: first.operator_icao ?? null,
        airlineIata: first.operator_iata ?? null,
        airlineName: first.operator ?? null,
        flightNumber: first.flight_number ?? first.ident,
        scheduledDeparture: dep,
        scheduledArrival: arr,
        durationMinutes: dep && arr ? durationMinutes(dep, arr) : null,
        isDirect: segs.length <= 1,
        stops: Math.max(0, segs.length - 1),
      };
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
