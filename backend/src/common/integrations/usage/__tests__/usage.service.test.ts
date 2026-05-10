jest.mock("../../../database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

import { AppDataSource } from "../../../database/data-source";
import { getUsageStats } from "../usage.service";

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

type ProviderName = "opensky" | "aeroapi";

interface FakeData {
  count: number;
  byEndpoint: { endpoint: string; count: string }[];
}

function makeQueryBuilder(byProvider: Record<ProviderName, FakeData>) {
  let captured: ProviderName | null = null;
  const qb: Record<string, jest.Mock> = {};
  qb.where = jest.fn((_clause: string, params: { provider: ProviderName }) => {
    captured = params.provider;
    return qb;
  });
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.groupBy = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.limit = jest.fn().mockReturnValue(qb);
  qb.getCount = jest.fn(async () => byProvider[captured!].count);
  qb.getRawMany = jest.fn(async () => byProvider[captured!].byEndpoint);
  return qb;
}

describe("getUsageStats", () => {
  beforeEach(() => {
    delete process.env.OPENSKY_DAILY_LIMIT;
    delete process.env.AEROAPI_MONTHLY_LIMIT;
    mockGetRepository.mockReset();
  });

  it("returns aggregated stats for both providers using env-configured limits", async () => {
    process.env.OPENSKY_DAILY_LIMIT = "1000";
    process.env.AEROAPI_MONTHLY_LIMIT = "500";

    const byProvider = {
      opensky: {
        count: 250,
        byEndpoint: [{ endpoint: "/states/all", count: "240" }],
      },
      aeroapi: {
        count: 100,
        byEndpoint: [{ endpoint: "/flights/:ident", count: "80" }],
      },
    };

    mockGetRepository.mockReturnValue({
      createQueryBuilder: jest.fn(() => makeQueryBuilder(byProvider)),
      find: jest.fn().mockResolvedValue([]),
    });

    const result = await getUsageStats();

    const opensky = result.providers.find((p) => p.provider === "opensky")!;
    const aeroapi = result.providers.find((p) => p.provider === "aeroapi")!;

    expect(opensky.period).toBe("day");
    expect(opensky.limit).toBe(1000);
    expect(opensky.used).toBe(250);
    expect(opensky.remaining).toBe(750);
    expect(opensky.percent).toBe(25);
    expect(opensky.byEndpoint).toEqual([
      { endpoint: "/states/all", count: 240 },
    ]);

    expect(aeroapi.period).toBe("month");
    expect(aeroapi.limit).toBe(500);
    expect(aeroapi.used).toBe(100);
    expect(aeroapi.remaining).toBe(400);
    expect(aeroapi.percent).toBe(20);
  });

  it("clamps percent and remaining when usage exceeds the limit", async () => {
    process.env.OPENSKY_DAILY_LIMIT = "100";

    const byProvider = {
      opensky: { count: 500, byEndpoint: [] },
      aeroapi: { count: 0, byEndpoint: [] },
    };

    mockGetRepository.mockReturnValue({
      createQueryBuilder: jest.fn(() => makeQueryBuilder(byProvider)),
      find: jest.fn().mockResolvedValue([]),
    });

    const result = await getUsageStats();
    const opensky = result.providers.find((p) => p.provider === "opensky")!;

    expect(opensky.used).toBe(500);
    expect(opensky.remaining).toBe(0);
    expect(opensky.percent).toBe(100);
  });
});
