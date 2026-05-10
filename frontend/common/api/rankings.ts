import { apiClient } from "./client";

export type RankingMetric = "distance" | "flights" | "countries";

export interface RankingEntryDTO {
  rank: number;
  userId: string;
  nickname: string;
  value: number;
}

export interface MyRankingResponseDTO {
  hidden?: true;
  entry?: RankingEntryDTO;
}

export async function getRankings(
  metric: RankingMetric,
  limit = 100,
): Promise<RankingEntryDTO[]> {
  const { data } = await apiClient.get<{ items: RankingEntryDTO[] }>(
    "/rankings",
    { params: { metric, limit } },
  );
  return data.items;
}

export async function getMyRanking(
  metric: RankingMetric,
): Promise<MyRankingResponseDTO> {
  const { data } = await apiClient.get<MyRankingResponseDTO>("/rankings/me", {
    params: { metric },
  });
  return data;
}
