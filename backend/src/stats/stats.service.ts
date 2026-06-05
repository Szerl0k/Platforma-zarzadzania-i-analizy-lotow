import { StatsRepository, UserHistoryRow } from "./stats.repository";
import {
  AirlineCountDTO,
  LongestFlightDTO,
  UserRouteDTO,
  UserStatsDTO,
  YearStatsDTO,
} from "./stats.dto";

function travelYear(row: UserHistoryRow): number {
  const yyyy = row.travelDate?.slice(0, 4);
  return yyyy ? Number.parseInt(yyyy, 10) : 0;
}

function topAirlines(rows: UserHistoryRow[], limit: number): AirlineCountDTO[] {
  const counts = new Map<string, AirlineCountDTO>();
  for (const row of rows) {
    if (!row.airlineIcao) continue;
    const key = row.airlineIcao;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { icao: key, name: row.airlineName ?? key, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.icao.localeCompare(b.icao))
    .slice(0, limit);
}

function findLongestFlight(rows: UserHistoryRow[]): LongestFlightDTO | null {
  let best: UserHistoryRow | null = null;
  for (const row of rows) {
    if (row.distanceKm == null) continue;
    if (!best || (best.distanceKm ?? 0) < row.distanceKm) {
      best = row;
    }
  }
  if (!best || best.distanceKm == null) return null;
  return {
    ident: best.ident,
    originIcao: best.originIcao,
    destinationIcao: best.destinationIcao,
    distanceKm: best.distanceKm,
    durationMinutes: best.durationMinutes,
    travelDate: best.travelDate,
  };
}

function perYearStats(rows: UserHistoryRow[]): YearStatsDTO[] {
  const byYear = new Map<number, YearStatsDTO>();
  for (const row of rows) {
    const year = travelYear(row);
    if (!year) continue;
    const entry = byYear.get(year) ?? { year, flights: 0, distanceKm: 0 };
    entry.flights += 1;
    if (row.distanceKm) entry.distanceKm += row.distanceKm;
    byYear.set(year, entry);
  }
  return [...byYear.values()]
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .reverse();
}

function countCountries(rows: UserHistoryRow[]): number {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.destinationCountryCode) set.add(row.destinationCountryCode);
  }
  return set.size;
}

function countAirports(rows: UserHistoryRow[]): number {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.originIcao) set.add(row.originIcao);
    if (row.destinationIcao) set.add(row.destinationIcao);
  }
  return set.size;
}

export class StatsService {
  constructor(private readonly repo: StatsRepository = new StatsRepository()) {}

  async getMyStats(userId: string): Promise<UserStatsDTO> {
    const rows = await this.repo.listUserHistoryRows(userId);

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
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
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
    const rows = await this.repo.listUserHistoryRows(userId);
    const filtered = year ? rows.filter((r) => travelYear(r) === year) : rows;
    return filtered.map((r) => ({
      id: r.id,
      travelDate: r.travelDate,
      ident: r.ident,
      airlineIcao: r.airlineIcao,
      airlineName: r.airlineName,
      originIcao: r.originIcao,
      originIata: r.originIata,
      originName: r.originName,
      originLat: r.originLat,
      originLon: r.originLon,
      destinationIcao: r.destinationIcao,
      destinationIata: r.destinationIata,
      destinationName: r.destinationName,
      destinationLat: r.destinationLat,
      destinationLon: r.destinationLon,
      durationMinutes: r.durationMinutes,
      distanceKm: r.distanceKm,
    }));
  }
}

export const __testing__ = {
  topAirlines,
  findLongestFlight,
  perYearStats,
  countCountries,
  countAirports,
  travelYear,
};
