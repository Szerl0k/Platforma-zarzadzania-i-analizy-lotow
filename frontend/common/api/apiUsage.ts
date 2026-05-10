import { apiClient } from "./client";

export type ApiUsageProvider = "opensky" | "aeroapi";
export type ApiUsagePeriod = "day" | "month";

export interface ApiUsageRecentCall {
  id: string;
  endpoint: string;
  statusCode: number | null;
  success: boolean;
  durationMs: number;
  calledAt: string;
}

export interface ProviderUsageStats {
  provider: ApiUsageProvider;
  period: ApiUsagePeriod;
  windowStart: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  byEndpoint: { endpoint: string; count: number }[];
  recent: ApiUsageRecentCall[];
}

export interface UsageStatsResponse {
  providers: ProviderUsageStats[];
}

export async function getApiUsageStats(): Promise<UsageStatsResponse> {
  const { data } = await apiClient.get<UsageStatsResponse>("/admin/api-usage");
  return data;
}
