import { StatsRepository } from "../stats.repository";

/**
 * Chainable QueryBuilder stub: every builder method returns the same stub
 * (invoking subquery callbacks so their construction runs too), while the
 * terminal getRawMany/getRawOne resolve canned values.
 */
function makeQb(rawMany: unknown[], rawOne: unknown) {
  const qb: Record<string, jest.Mock> = {};
  const chain = [
    "select",
    "addSelect",
    "from",
    "leftJoin",
    "innerJoin",
    "where",
    "andWhere",
    "orWhere",
    "groupBy",
    "orderBy",
    "addOrderBy",
    "limit",
  ];
  for (const m of chain) {
    qb[m] = jest.fn((arg: unknown) => {
      if (typeof arg === "function") (arg as (b: unknown) => void)(qb);
      return qb;
    });
  }
  qb.getRawMany = jest.fn().mockResolvedValue(rawMany);
  qb.getRawOne = jest.fn().mockResolvedValue(rawOne);
  return qb;
}

function makeRepo(rawMany: unknown[] = [], rawOne: unknown = undefined) {
  const ds = {
    createQueryBuilder: jest.fn(() => makeQb(rawMany, rawOne)),
  };
  return new StatsRepository(ds as never);
}

describe("StatsRepository", () => {
  it("builds the user history read-model query", async () => {
    const rows = [{ id: "h1" }];
    const repo = makeRepo(rows);
    await expect(repo.listUserHistoryRows("u1")).resolves.toEqual(rows);
  });

  it("builds the three leaderboard queries", async () => {
    const repo = makeRepo([{ userId: "u1", value: 1 }]);
    await expect(repo.fetchDistanceRanking(10)).resolves.toHaveLength(1);
    await expect(repo.fetchFlightsRanking(10)).resolves.toHaveLength(1);
    await expect(repo.fetchCountriesRanking(10)).resolves.toHaveLength(1);
  });

  it("returns per-user metric values (defaulting to 0)", async () => {
    const repo = makeRepo([], { value: 42 });
    await expect(repo.fetchUserDistance("u1")).resolves.toBe(42);
    await expect(repo.fetchUserFlightCount("u1")).resolves.toBe(42);
    await expect(repo.fetchUserCountriesCount("u1")).resolves.toBe(42);

    const empty = makeRepo([], undefined);
    await expect(empty.fetchUserDistance("u1")).resolves.toBe(0);
  });

  it("resolves a ranking user row", async () => {
    const repo = makeRepo([], { id: "u1", profilePublic: true });
    await expect(repo.fetchUserById("u1")).resolves.toEqual({
      id: "u1",
      profilePublic: true,
    });

    const none = makeRepo([], undefined);
    await expect(none.fetchUserById("u1")).resolves.toBeNull();
  });

  it("counts users above for each metric", async () => {
    const repo = makeRepo([], { count: 3 });
    await expect(repo.countUsersAbove("distance", "u1", 5)).resolves.toBe(3);
    await expect(repo.countUsersAbove("flights", "u1", 5)).resolves.toBe(3);
    await expect(repo.countUsersAbove("countries", "u1", 5)).resolves.toBe(3);
  });
});
