import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

const getMyStats = jest.fn();
const getMyRoutes = jest.fn();
const getRankings = jest.fn();
const getMyRanking = jest.fn();

jest.mock("../stats.service", () => ({
  StatsService: jest.fn().mockImplementation(() => ({
    getMyStats,
    getMyRoutes,
  })),
}));

jest.mock("../rankings.service", () => ({
  RankingsService: jest.fn().mockImplementation(() => ({
    getRankings,
    getMyRanking,
  })),
}));

jest.mock("../../common/middleware/auth", () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) {
      const err = new Error("Unauthorized") as Error & { status: number };
      err.status = 401;
      throw err;
    }
    next();
  },
}));

import statsRoutes from "../stats.routes";
import rankingsRoutes from "../rankings.routes";

function makeApp(userId: string | null = "user-1") {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (userId) req.userId = userId;
    next();
  });
  app.use("/stats", statsRoutes);
  app.use("/rankings", rankingsRoutes);
  app.use(
    (
      err: Error & { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status = err.status ?? 500;
      res.status(status).json({ error: err.message });
    },
  );
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /stats/me", () => {
  it("returns the user stats payload", async () => {
    getMyStats.mockResolvedValue({ totalFlights: 7 });
    const res = await request(makeApp()).get("/stats/me");
    expect(res.status).toBe(200);
    expect(res.body.totalFlights).toBe(7);
    expect(getMyStats).toHaveBeenCalledWith("user-1");
  });
});

describe("GET /stats/me/routes", () => {
  it("rejects non-numeric year", async () => {
    const res = await request(makeApp()).get("/stats/me/routes?year=abc");
    expect(res.status).toBe(500); // ZodError handled by default error handler
    expect(getMyRoutes).not.toHaveBeenCalled();
  });

  it("forwards parsed year", async () => {
    getMyRoutes.mockResolvedValue([]);
    const res = await request(makeApp()).get("/stats/me/routes?year=2025");
    expect(res.status).toBe(200);
    expect(getMyRoutes).toHaveBeenCalledWith("user-1", 2025);
  });
});

describe("GET /rankings", () => {
  it("is publicly accessible", async () => {
    getRankings.mockResolvedValue([{ rank: 1, userId: "u1", nickname: "n", value: 100 }]);
    const res = await request(makeApp(null)).get("/rankings?metric=flights");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(getRankings).toHaveBeenCalledWith("flights", 100);
  });

  it("defaults to distance metric", async () => {
    getRankings.mockResolvedValue([]);
    const res = await request(makeApp(null)).get("/rankings");
    expect(res.status).toBe(200);
    expect(getRankings).toHaveBeenCalledWith("distance", 100);
  });
});

describe("GET /rankings/me", () => {
  it("requires auth", async () => {
    const res = await request(makeApp(null)).get("/rankings/me?metric=flights");
    expect(res.status).toBe(401);
    expect(getMyRanking).not.toHaveBeenCalled();
  });

  it("returns caller ranking when authed", async () => {
    getMyRanking.mockResolvedValue({
      entry: { rank: 5, userId: "user-1", nickname: "globetrotter", value: 12 },
    });
    const res = await request(makeApp()).get("/rankings/me?metric=flights");
    expect(res.status).toBe(200);
    expect(res.body.entry.rank).toBe(5);
    expect(getMyRanking).toHaveBeenCalledWith("flights", "user-1");
  });
});
