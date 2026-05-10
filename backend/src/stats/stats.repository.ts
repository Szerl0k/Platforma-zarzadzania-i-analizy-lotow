import { DataSource, Repository } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { FlightHistory } from "../tracking/entities/FlightHistory";
import { User } from "../users/entities/User";

const HISTORY_RELATIONS = [
  "flight",
  "flight.origin",
  "flight.origin.city",
  "flight.origin.city.country",
  "flight.destination",
  "flight.destination.city",
  "flight.destination.city.country",
  "flight.operatingAirline",
];

export interface RankingRow {
  userId: string;
  nickname: string | null;
  email: string;
  value: number;
}

export class StatsRepository {
  private readonly history: Repository<FlightHistory>;
  private readonly users: Repository<User>;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    this.history = dataSource.getRepository(FlightHistory);
    this.users = dataSource.getRepository(User);
  }

  async listUserHistoryWithJoins(userId: string): Promise<FlightHistory[]> {
    return this.history.find({
      where: { userId },
      relations: HISTORY_RELATIONS,
      order: { travelDate: "DESC" },
    });
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
      .from(User, "u")
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
      .from(User, "u")
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
      .from(User, "u")
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
    const row = await this.history
      .createQueryBuilder("fh")
      .select("COUNT(fh.id)::int", "value")
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

  async fetchUserById(userId: string): Promise<User | null> {
    return this.users.findOne({ where: { id: userId } });
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
            .from(User, "u")
            .innerJoin("flight_history", "fh", "fh.user_id = u.id")
            .innerJoin("flights", "f", "f.id = fh.flight_id")
            .innerJoin("airports", "o", "o.icao_code = f.origin_icao")
            .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
            .where("u.profile_public = TRUE")
            .andWhere("u.id <> :uid", { uid: userId })
            .groupBy("u.id");
        }, "ranked")
        .where("ranked.value > :v", { v: userValue })
        .orWhere(
          "(ranked.value = :v AND ranked.\"userId\" < :uid)",
          { v: userValue, uid: userId },
        )
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
            .from(User, "u")
            .innerJoin("flight_history", "fh", "fh.user_id = u.id")
            .where("u.profile_public = TRUE")
            .andWhere("u.id <> :uid", { uid: userId })
            .groupBy("u.id");
        }, "ranked")
        .where("ranked.value > :v", { v: userValue })
        .orWhere(
          "(ranked.value = :v AND ranked.\"userId\" < :uid)",
          { v: userValue, uid: userId },
        )
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
          .from(User, "u")
          .innerJoin("flight_history", "fh", "fh.user_id = u.id")
          .innerJoin("flights", "f", "f.id = fh.flight_id")
          .innerJoin("airports", "d", "d.icao_code = f.destination_icao")
          .innerJoin("cities", "c", "c.id = d.city_id")
          .where("u.profile_public = TRUE")
          .andWhere("u.id <> :uid", { uid: userId })
          .groupBy("u.id");
      }, "ranked")
      .where("ranked.value > :v", { v: userValue })
      .orWhere(
        "(ranked.value = :v AND ranked.\"userId\" < :uid)",
        { v: userValue, uid: userId },
      )
      .getRawOne<{ count: number }>();
    return row?.count ?? 0;
  }
}
