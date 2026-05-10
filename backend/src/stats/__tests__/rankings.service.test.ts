import { RankingsService } from "../rankings.service";
import { makeUserWithPublicProfile } from "../../tracking/__tests__/test-utils";

function makeRepoMock() {
  return {
    listUserHistoryWithJoins: jest.fn(),
    fetchDistanceRanking: jest.fn(),
    fetchFlightsRanking: jest.fn(),
    fetchCountriesRanking: jest.fn(),
    fetchUserDistance: jest.fn(),
    fetchUserFlightCount: jest.fn(),
    fetchUserCountriesCount: jest.fn(),
    fetchUserById: jest.fn(),
    countUsersAbove: jest.fn(),
  };
}

describe("RankingsService.getRankings", () => {
  it("maps repository rows to ranked entries with nickname fallback", async () => {
    const repo = makeRepoMock();
    repo.fetchFlightsRanking.mockResolvedValue([
      { userId: "u1", nickname: "alpha", email: "a@x.com", value: 30 },
      { userId: "u2", nickname: null, email: "beta@x.com", value: 20 },
    ]);
    const service = new RankingsService(repo as never);
    const result = await service.getRankings("flights", 100);
    expect(result).toEqual([
      { rank: 1, userId: "u1", nickname: "alpha", value: 30 },
      { rank: 2, userId: "u2", nickname: "beta", value: 20 },
    ]);
  });

  it("rounds distance values", async () => {
    const repo = makeRepoMock();
    repo.fetchDistanceRanking.mockResolvedValue([
      { userId: "u1", nickname: "a", email: "a@x", value: 1234.7 },
    ]);
    const service = new RankingsService(repo as never);
    const result = await service.getRankings("distance", 100);
    expect(result[0]?.value).toBe(1235);
  });
});

describe("RankingsService.getMyRanking", () => {
  it("returns hidden when profilePublic is false", async () => {
    const repo = makeRepoMock();
    repo.fetchUserById.mockResolvedValue(
      makeUserWithPublicProfile({ id: "u1", profilePublic: false }),
    );
    const service = new RankingsService(repo as never);
    const result = await service.getMyRanking("distance", "u1");
    expect(result).toEqual({ hidden: true });
  });

  it("returns hidden when user not found", async () => {
    const repo = makeRepoMock();
    repo.fetchUserById.mockResolvedValue(null);
    const service = new RankingsService(repo as never);
    const result = await service.getMyRanking("flights", "missing");
    expect(result).toEqual({ hidden: true });
  });

  it("computes rank from countUsersAbove", async () => {
    const repo = makeRepoMock();
    repo.fetchUserById.mockResolvedValue(
      makeUserWithPublicProfile({
        id: "u1",
        nickname: "globetrotter",
        profilePublic: true,
      }),
    );
    repo.fetchUserDistance.mockResolvedValue(5432.4);
    repo.countUsersAbove.mockResolvedValue(7);
    const service = new RankingsService(repo as never);
    const result = await service.getMyRanking("distance", "u1");
    expect(result.entry).toEqual({
      rank: 8,
      userId: "u1",
      nickname: "globetrotter",
      value: 5432,
    });
  });

  it("returns rank 0 when caller has no flights yet", async () => {
    const repo = makeRepoMock();
    repo.fetchUserById.mockResolvedValue(
      makeUserWithPublicProfile({ id: "u1", profilePublic: true }),
    );
    repo.fetchUserFlightCount.mockResolvedValue(0);
    const service = new RankingsService(repo as never);
    const result = await service.getMyRanking("flights", "u1");
    expect(result.entry?.rank).toBe(0);
    expect(result.entry?.value).toBe(0);
    expect(repo.countUsersAbove).not.toHaveBeenCalled();
  });
});
