import { AppDataSource } from "../../database/data-source";
import { ApiUsageLog, ApiUsageProvider } from "./ApiUsageLog";

export type UsagePeriod = "day" | "month";

export interface ProviderUsageStats {
  provider: ApiUsageProvider;
  period: UsagePeriod;
  windowStart: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  byEndpoint: { endpoint: string; count: number }[];
  recent: {
    id: string;
    endpoint: string;
    statusCode: number | null;
    success: boolean;
    durationMs: number;
    calledAt: string;
  }[];
}

export interface UsageStatsResponse {
  providers: ProviderUsageStats[];
}

const OPENSKY_DEFAULT_DAILY_LIMIT = 4000;
const AEROAPI_DEFAULT_MONTHLY_LIMIT = 1000;

function readLimit(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function buildProviderStats(
  provider: ApiUsageProvider,
  period: UsagePeriod,
  windowStart: Date,
  limit: number,
): Promise<ProviderUsageStats> {
  const repo = AppDataSource.getRepository(ApiUsageLog);

  const used = await repo
    .createQueryBuilder("log")
    .where("log.provider = :provider", { provider })
    .andWhere("log.calledAt >= :windowStart", { windowStart })
    .getCount();

  const byEndpointRows = await repo
    .createQueryBuilder("log")
    .select("log.endpoint", "endpoint")
    .addSelect("COUNT(*)", "count")
    .where("log.provider = :provider", { provider })
    .andWhere("log.calledAt >= :windowStart", { windowStart })
    .groupBy("log.endpoint")
    .orderBy("count", "DESC")
    .limit(10)
    .getRawMany<{ endpoint: string; count: string }>();

  const recent = await repo.find({
    where: { provider },
    order: { calledAt: "DESC" },
    take: 20,
  });

  const remaining = Math.max(limit - used, 0);
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return {
    provider,
    period,
    windowStart: windowStart.toISOString(),
    used,
    limit,
    remaining,
    percent: Math.round(percent * 10) / 10,
    byEndpoint: byEndpointRows.map((r) => ({
      endpoint: r.endpoint,
      count: Number.parseInt(r.count, 10),
    })),
    recent: recent.map((log) => ({
      id: log.id,
      endpoint: log.endpoint,
      statusCode: log.statusCode,
      success: log.success,
      durationMs: log.durationMs,
      calledAt: log.calledAt.toISOString(),
    })),
  };
}

export async function getUsageStats(): Promise<UsageStatsResponse> {
  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const monthStart = startOfUtcMonth(now);

  const openskyLimit = readLimit(
    "OPENSKY_DAILY_LIMIT",
    OPENSKY_DEFAULT_DAILY_LIMIT,
  );
  const aeroapiLimit = readLimit(
    "AEROAPI_MONTHLY_LIMIT",
    AEROAPI_DEFAULT_MONTHLY_LIMIT,
  );

  const [opensky, aeroapi] = await Promise.all([
    buildProviderStats("opensky", "day", dayStart, openskyLimit),
    buildProviderStats("aeroapi", "month", monthStart, aeroapiLimit),
  ]);

  return { providers: [opensky, aeroapi] };
}
