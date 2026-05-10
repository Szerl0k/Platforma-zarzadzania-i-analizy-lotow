import { FlightHistory } from "../tracking/entities/FlightHistory";
import { haversineDistanceKm, airportCoords } from "../common/utils/geo";
import { StatsRepository } from "./stats.repository";
import {
  AirlineCountDTO,
  LongestFlightDTO,
  UserRouteDTO,
  UserStatsDTO,
  YearStatsDTO,
} from "./stats.dto";

interface EnrichedHistoryRow {
  history: FlightHistory;
  distanceKm: number | null;
  durationMinutes: number | null;
  year: number;
}

function durationMinutesOf(history: FlightHistory): number | null {
  const f = history.flight;
  if (!f) return null;
  if (f.actualOut && f.actualIn) {
    return Math.round(
      (f.actualIn.getTime() - f.actualOut.getTime()) / 60000,
    );
  }
  if (f.scheduledOut && f.scheduledIn) {
    return Math.round(
      (f.scheduledIn.getTime() - f.scheduledOut.getTime()) / 60000,
    );
  }
  return null;
}

function distanceKmOf(history: FlightHistory): number | null {
  const f = history.flight;
  if (!f?.origin || !f.destination) return null;
  const origin = airportCoords(f.origin);
  const dest = airportCoords(f.destination);
  if (!origin || !dest) return null;
  return haversineDistanceKm(origin.lat, origin.lon, dest.lat, dest.lon);
}

function travelYear(history: FlightHistory): number {
  const yyyy = history.travelDate?.slice(0, 4);
  return yyyy ? Number.parseInt(yyyy, 10) : 0;
}

function enrich(rows: FlightHistory[]): EnrichedHistoryRow[] {
  return rows.map((history) => ({
    history,
    distanceKm: distanceKmOf(history),
    durationMinutes: durationMinutesOf(history),
    year: travelYear(history),
  }));
}

function topAirlines(
  rows: EnrichedHistoryRow[],
  limit: number,
): AirlineCountDTO[] {
  const counts = new Map<string, AirlineCountDTO>();
  for (const { history } of rows) {
    const airline = history.flight?.operatingAirline;
    if (!airline?.icaoCode) continue;
    const key = airline.icaoCode;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { icao: key, name: airline.name, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.icao.localeCompare(b.icao))
    .slice(0, limit);
}

function findLongestFlight(rows: EnrichedHistoryRow[]): LongestFlightDTO | null {
  let best: EnrichedHistoryRow | null = null;
  for (const row of rows) {
    if (row.distanceKm == null) continue;
    if (!best || (best.distanceKm ?? 0) < row.distanceKm) {
      best = row;
    }
  }
  if (!best || best.distanceKm == null) return null;
  return {
    ident: best.history.flight?.identIcao ?? null,
    originIcao: best.history.flight?.origin?.icaoCode ?? null,
    destinationIcao: best.history.flight?.destination?.icaoCode ?? null,
    distanceKm: best.distanceKm,
    durationMinutes: best.durationMinutes,
    travelDate: best.history.travelDate,
  };
}

function perYearStats(rows: EnrichedHistoryRow[]): YearStatsDTO[] {
  const byYear = new Map<number, YearStatsDTO>();
  for (const row of rows) {
    if (!row.year) continue;
    const entry = byYear.get(row.year) ?? {
      year: row.year,
      flights: 0,
      distanceKm: 0,
    };
    entry.flights += 1;
    if (row.distanceKm) entry.distanceKm += row.distanceKm;
    byYear.set(row.year, entry);
  }
  return [...byYear.values()]
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .reverse();
}

function countCountries(rows: EnrichedHistoryRow[]): number {
  const set = new Set<string>();
  for (const { history } of rows) {
    const code = history.flight?.destination?.city?.countryCode;
    if (code) set.add(code);
  }
  return set.size;
}

function countAirports(rows: EnrichedHistoryRow[]): number {
  const set = new Set<string>();
  for (const { history } of rows) {
    const o = history.flight?.origin?.icaoCode;
    const d = history.flight?.destination?.icaoCode;
    if (o) set.add(o);
    if (d) set.add(d);
  }
  return set.size;
}

export class StatsService {
  constructor(private readonly repo: StatsRepository = new StatsRepository()) {}

  async getMyStats(userId: string): Promise<UserStatsDTO> {
    const rows = enrich(await this.repo.listUserHistoryWithJoins(userId));

    const totalFlights = rows.length;
    const totalDistanceKm = rows.reduce(
      (sum, r) => sum + (r.distanceKm ?? 0),
      0,
    );
    const totalAirTimeMinutes = rows.reduce(
      (sum, r) => sum + (r.durationMinutes ?? 0),
      0,
    );
    const durations = rows
      .map((r) => r.durationMinutes)
      .filter((d): d is number => d != null);
    const averageDurationMinutes =
      durations.length > 0
        ? Math.round(
            durations.reduce((s, d) => s + d, 0) / durations.length,
          )
        : 0;

    const airlines = topAirlines(rows, 5);

    return {
      totalFlights,
      totalDistanceKm: Math.round(totalDistanceKm),
      totalAirTimeMinutes,
      countriesVisited: countCountries(rows),
      airportsVisited: countAirports(rows),
      topAirline: airlines[0] ?? null,
      longestFlight: findLongestFlight(rows),
      averageDurationMinutes,
      perYear: perYearStats(rows),
      topAirlines: airlines,
    };
  }

  async getMyRoutes(userId: string, year?: number): Promise<UserRouteDTO[]> {
    const rows = await this.repo.listUserHistoryWithJoins(userId);
    const filtered = year
      ? rows.filter((r) => travelYear(r) === year)
      : rows;
    return filtered.map((h) => {
      const f = h.flight;
      const origin = f?.origin ? airportCoords(f.origin) : null;
      const dest = f?.destination ? airportCoords(f.destination) : null;
      return {
        id: h.id,
        travelDate: h.travelDate,
        ident: f?.identIcao ?? null,
        airlineIcao: f?.operatingAirline?.icaoCode ?? null,
        airlineName: f?.operatingAirline?.name ?? null,
        originIcao: f?.origin?.icaoCode ?? null,
        originIata: f?.origin?.iataCode ?? null,
        originName: f?.origin?.name ?? null,
        originLat: origin?.lat ?? null,
        originLon: origin?.lon ?? null,
        destinationIcao: f?.destination?.icaoCode ?? null,
        destinationIata: f?.destination?.iataCode ?? null,
        destinationName: f?.destination?.name ?? null,
        destinationLat: dest?.lat ?? null,
        destinationLon: dest?.lon ?? null,
        durationMinutes: durationMinutesOf(h),
        distanceKm: distanceKmOf(h),
      };
    });
  }
}

export const __testing__ = {
  enrich,
  topAirlines,
  findLongestFlight,
  perYearStats,
  countCountries,
  countAirports,
  durationMinutesOf,
  distanceKmOf,
};
