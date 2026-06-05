import { DataSource } from "typeorm";
import { AppDataSource } from "../common/database/data-source";

export interface RankingRow {
  userId: string;
  nickname: string | null;
  email: string;
  value: number;
}

/** Minimal user read-model for ranking responses (no users-module entity). */
export interface RankingUserRow {
  id: string;
  nickname: string | null;
  email: string;
  profilePublic: boolean;
}

/**
 * Flat read-model row for a user's flight history. All joins, distance and
 * duration are computed in SQL so the stats module owns dedicated read queries
 * instead of importing the tracking/users entity graph.
 */
export interface UserHistoryRow {
  id: string;
  travelDate: string;
  ident: string | null;
  airlineIcao: string | null;
  airlineName: string | null;
  originIcao: string | null;
  originIata: string | null;
  originName: string | null;
  originLat: number | null;
  originLon: number | null;
  destinationIcao: string | null;
  destinationIata: string | null;
  destinationName: string | null;
  destinationLat: number | null;
  destinationLon: number | null;
  destinationCountryCode: string | null;
  durationMinutes: number | null;
  distanceKm: number | null;
}

const DURATION_MINUTES_SQL = `CASE
   WHEN f.actual_out IS NOT NULL AND f.actual_in IS NOT NULL
     THEN ROUND(EXTRACT(EPOCH FROM (f.actual_in - f.actual_out)) / 60)::int
   WHEN f.scheduled_out IS NOT NULL AND f.scheduled_in IS NOT NULL
     THEN ROUND(EXTRACT(EPOCH FROM (f.scheduled_in - f.scheduled_out)) / 60)::int
   ELSE NULL
 END`;

const DISTANCE_KM_SQL = `CASE
   WHEN o.location IS NOT NULL AND d.location IS NOT NULL
     THEN (ST_DistanceSphere(o.location, d.location) / 1000)::float
   ELSE NULL
 END`;

/**
 * Read-model repository for statistics and rankings. It queries the shared
 * tables (flight_history, flights, airports, cities, airlines, users) directly
 * by name — a deliberate, contained read-only coupling — and never imports the
 * owning modules' entity classes.
 */
export class StatsRepository {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async listUserHistoryRows(userId: string): Promise<UserHistoryRow[]> {
    return this.dataSource
      .createQueryBuilder()
      .select("fh.id", "id")
      .addSelect("to_char(fh.travel_date, 'YYYY-MM-DD')", "travelDate")
      .addSelect("f.ident_icao", "ident")
      .addSelect("al.icao_code", "airlineIcao")
      .addSelect("al.name", "airlineName")
      .addSelect("o.icao_code", "originIcao")
      .addSelect("o.iata_code", "originIata")
      .addSelect("o.name", "originName")
      .addSelect("ST_Y(o.location)", "originLat")
      .addSelect("ST_X(o.location)", "originLon")
      .addSelect("d.icao_code", "destinationIcao")
      .addSelect("d.iata_code", "destinationIata")
      .addSelect("d.name", "destinationName")
      .addSelect("ST_Y(d.location)", "destinationLat")
      .addSelect("ST_X(d.location)", "destinationLon")
      .addSelect("dc.country_code", "destinationCountryCode")
      .addSelect(DURATION_MINUTES_SQL, "durationMinutes")
      .addSelect(DISTANCE_KM_SQL, "distanceKm")
      .from("flight_history", "fh")
      .leftJoin("flights", "f", "f.id = fh.flight_id")
      .leftJoin("airlines", "al", "al.icao_code = f.operating_airline_icao")
      .leftJoin("airports", "o", "o.icao_code = f.origin_icao")
      .leftJoin("airports", "d", "d.icao_code = f.destination_icao")
      .leftJoin("cities", "dc", "dc.id = d.city_id")
      .where("fh.user_id = :userId", { userId })
      .orderBy("fh.travel_date", "DESC")
      .getRawMany<UserHistoryRow>();
  }

  async fetchDistanceRanking(limit: number): Promise<RankingRow[]> {
    return this.dataSource
      .createQueryBuilder()
      .select("u.id", "userId")
      .addSelect("u.nickname", "nickname")
      .addSelect("u.email", "email")
      .addSelect(
        "COALESCE(SUM(ST_DistanceSphere(o.location, d.location) / 1000), 0)::float",
        "value",
      )
      .from("users", "u")
      .innerJoin("flight_history", "fh", "fh.user_id = u.id")
      .innerJoin("flights", "f", "f.id = fh.flight_id")
      .innerJoin("airports", "o", "o.icao_code = f.origin_icao")
      .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
      .where("u.profile_public = TRUE")
      .groupBy("u.id")
      .orderBy("value", "DESC")
      .addOrderBy("u.id", "ASC")
      .limit(limit)
      .getRawMany();
  }

  async fetchFlightsRanking(limit: number): Promise<RankingRow[]> {
    return this.dataSource
      .createQueryBuilder()
      .select("u.id", "userId")
      .addSelect("u.nickname", "nickname")
      .addSelect("u.email", "email")
      .addSelect("COUNT(fh.id)::int", "value")
      .from("users", "u")
      .innerJoin("flight_history", "fh", "fh.user_id = u.id")
      .where("u.profile_public = TRUE")
      .groupBy("u.id")
      .orderBy("value", "DESC")
      .addOrderBy("u.id", "ASC")
      .limit(limit)
      .getRawMany();
  }

  async fetchCountriesRanking(limit: number): Promise<RankingRow[]> {
    return this.dataSource
      .createQueryBuilder()
      .select("u.id", "userId")
      .addSelect("u.nickname", "nickname")
      .addSelect("u.email", "email")
      .addSelect("COUNT(DISTINCT c.country_code)::int", "value")
      .from("users", "u")
      .innerJoin("flight_history", "fh", "fh.user_id = u.id")
      .innerJoin("flights", "f", "f.id = fh.flight_id")
      .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
      .innerJoin("cities", "c", "c.id = d.city_id")
      .where("u.profile_public = TRUE")
      .groupBy("u.id")
      .orderBy("value", "DESC")
      .addOrderBy("u.id", "ASC")
      .limit(limit)
      .getRawMany();
  }

  async fetchUserDistance(userId: string): Promise<number> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select(
        "COALESCE(SUM(ST_DistanceSphere(o.location, d.location) / 1000), 0)::float",
        "value",
      )
      .from("flight_history", "fh")
      .innerJoin("flights", "f", "f.id = fh.flight_id")
      .innerJoin("airports", "o", "o.icao_code = f.origin_icao")
      .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
      .where("fh.user_id = :userId", { userId })
      .getRawOne<{ value: number }>();
    return row?.value ?? 0;
  }

  async fetchUserFlightCount(userId: string): Promise<number> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select("COUNT(fh.id)::int", "value")
      .from("flight_history", "fh")
      .where("fh.user_id = :userId", { userId })
      .getRawOne<{ value: number }>();
    return row?.value ?? 0;
  }

  async fetchUserCountriesCount(userId: string): Promise<number> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select("COUNT(DISTINCT c.country_code)::int", "value")
      .from("flight_history", "fh")
      .innerJoin("flights", "f", "f.id = fh.flight_id")
      .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
      .innerJoin("cities", "c", "c.id = d.city_id")
      .where("fh.user_id = :userId", { userId })
      .getRawOne<{ value: number }>();
    return row?.value ?? 0;
  }

  async fetchUserById(userId: string): Promise<RankingUserRow | null> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select("u.id", "id")
      .addSelect("u.nickname", "nickname")
      .addSelect("u.email", "email")
      .addSelect("u.profile_public", "profilePublic")
      .from("users", "u")
      .where("u.id = :userId", { userId })
      .getRawOne<RankingUserRow>();
    return row ?? null;
  }

  async countUsersAbove(
    metric: "distance" | "flights" | "countries",
    userId: string,
    userValue: number,
  ): Promise<number> {
    if (metric === "distance") {
      const row = await this.dataSource
        .createQueryBuilder()
        .select("COUNT(*)::int", "count")
        .from((qb) => {
          return qb
            .select("u.id", "userId")
            .addSelect(
              "COALESCE(SUM(ST_DistanceSphere(o.location, d.location) / 1000), 0)::float",
              "value",
            )
            .from("users", "u")
            .innerJoin("flight_history", "fh", "fh.user_id = u.id")
            .innerJoin("flights", "f", "f.id = fh.flight_id")
            .innerJoin("airports", "o", "o.icao_code = f.origin_icao")
            .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
            .where("u.profile_public = TRUE")
            .andWhere("u.id <> :uid", { uid: userId })
            .groupBy("u.id");
        }, "ranked")
        .where("ranked.value > :v", { v: userValue })
        .orWhere('(ranked.value = :v AND ranked."userId" < :uid)', {
          v: userValue,
          uid: userId,
        })
        .getRawOne<{ count: number }>();
      return row?.count ?? 0;
    }
    if (metric === "flights") {
      const row = await this.dataSource
        .createQueryBuilder()
        .select("COUNT(*)::int", "count")
        .from((qb) => {
          return qb
            .select("u.id", "userId")
            .addSelect("COUNT(fh.id)::int", "value")
            .from("users", "u")
            .innerJoin("flight_history", "fh", "fh.user_id = u.id")
            .where("u.profile_public = TRUE")
            .andWhere("u.id <> :uid", { uid: userId })
            .groupBy("u.id");
        }, "ranked")
        .where("ranked.value > :v", { v: userValue })
        .orWhere('(ranked.value = :v AND ranked."userId" < :uid)', {
          v: userValue,
          uid: userId,
        })
        .getRawOne<{ count: number }>();
      return row?.count ?? 0;
    }
    const row = await this.dataSource
      .createQueryBuilder()
      .select("COUNT(*)::int", "count")
      .from((qb) => {
        return qb
          .select("u.id", "userId")
          .addSelect("COUNT(DISTINCT c.country_code)::int", "value")
          .from("users", "u")
          .innerJoin("flight_history", "fh", "fh.user_id = u.id")
          .innerJoin("flights", "f", "f.id = fh.flight_id")
          .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
          .innerJoin("cities", "c", "c.id = d.city_id")
          .where("u.profile_public = TRUE")
          .andWhere("u.id <> :uid", { uid: userId })
          .groupBy("u.id");
      }, "ranked")
      .where("ranked.value > :v", { v: userValue })
      .orWhere('(ranked.value = :v AND ranked."userId" < :uid)', {
        v: userValue,
        uid: userId,
      })
      .getRawOne<{ count: number }>();
    return row?.count ?? 0;
  }
}
