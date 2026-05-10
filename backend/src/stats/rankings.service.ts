import { StatsRepository, RankingRow } from "./stats.repository";
import {
  MyRankingResponseDTO,
  RankingEntryDTO,
  RankingMetric,
} from "./stats.dto";

function nicknameOrFallback(row: { nickname: string | null; email: string }): string {
  if (row.nickname && row.nickname.trim().length > 0) return row.nickname;
  const local = row.email.split("@")[0] ?? row.email;
  return local;
}

function toEntry(row: RankingRow, rank: number): RankingEntryDTO {
  return {
    rank,
    userId: row.userId,
    nickname: nicknameOrFallback(row),
    value: row.value,
  };
}

export class RankingsService {
  constructor(private readonly repo: StatsRepository = new StatsRepository()) {}

  private fetchRanking(metric: RankingMetric, limit: number): Promise<RankingRow[]> {
    if (metric === "distance") return this.repo.fetchDistanceRanking(limit);
    if (metric === "flights") return this.repo.fetchFlightsRanking(limit);
    return this.repo.fetchCountriesRanking(limit);
  }

  private fetchUserValue(metric: RankingMetric, userId: string): Promise<number> {
    if (metric === "distance") return this.repo.fetchUserDistance(userId);
    if (metric === "flights") return this.repo.fetchUserFlightCount(userId);
    return this.repo.fetchUserCountriesCount(userId);
  }

  async getRankings(
    metric: RankingMetric,
    limit: number,
  ): Promise<RankingEntryDTO[]> {
    const rows = await this.fetchRanking(metric, limit);
    return rows.map((row, idx) =>
      toEntry({ ...row, value: roundValue(metric, row.value) }, idx + 1),
    );
  }

  async getMyRanking(
    metric: RankingMetric,
    userId: string,
  ): Promise<MyRankingResponseDTO> {
    const user = await this.repo.fetchUserById(userId);
    if (!user) return { hidden: true };
    if (!user.profilePublic) return { hidden: true };

    const rawValue = await this.fetchUserValue(metric, userId);
    if (!rawValue || rawValue <= 0) {
      return {
        entry: {
          rank: 0,
          userId,
          nickname: nicknameOrFallback(user),
          value: 0,
        },
      };
    }

    const above = await this.repo.countUsersAbove(metric, userId, rawValue);
    const rank = above + 1;
    return {
      entry: {
        rank,
        userId,
        nickname: nicknameOrFallback(user),
        value: roundValue(metric, rawValue),
      },
    };
  }
}

function roundValue(metric: RankingMetric, value: number): number {
  if (metric === "distance") return Math.round(value);
  return value;
}
