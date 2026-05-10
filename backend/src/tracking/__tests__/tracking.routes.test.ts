import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "../../common/errors/http-errors";

const previewByIdent = jest.fn();
const confirmTrack = jest.fn();
const listMyFlights = jest.fn();
const countActive = jest.fn();
const untrack = jest.fn();
const listHistory = jest.fn();
const deleteHistory = jest.fn();
const exportHistoryCsv = jest.fn();
const listNotifications = jest.fn();
const countUnread = jest.fn();
const markNotificationRead = jest.fn();
const markAllNotificationsRead = jest.fn();

jest.mock("../tracking.service", () => ({
  TrackingService: jest.fn().mockImplementation(() => ({
    previewByIdent,
    confirmTrack,
    listMyFlights,
    countActive,
    untrack,
    listHistory,
    deleteHistory,
    exportHistoryCsv,
  })),
}));

jest.mock("../tracking.repository", () => ({
  TrackingRepository: jest.fn().mockImplementation(() => ({
    listNotifications,
    countUnread,
    markNotificationRead,
    markAllNotificationsRead,
  })),
}));

import trackingRoutes, { notificationsRouter } from "../tracking.routes";

function makeApp(userId: string | null = "user-1") {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (userId) req.userId = userId;
    next();
  });
  app.use("/tracking", trackingRoutes);
  app.use("/notifications", notificationsRouter);
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

describe("POST /tracking/preview", () => {
  it("returns 200 with flight DTO", async () => {
    previewByIdent.mockResolvedValue({ id: "f1", ident: "LOT123" });
    const res = await request(makeApp())
      .post("/tracking/preview")
      .send({ ident: "LOT123", date: "2026-05-10" });
    expect(res.status).toBe(200);
    expect(previewByIdent).toHaveBeenCalledWith("LOT123", "2026-05-10");
  });

  it("returns 400 when ident missing", async () => {
    const res = await request(makeApp()).post("/tracking/preview").send({});
    expect(res.status).toBe(500);
  });

  it("returns 400 when service throws BadRequest", async () => {
    previewByIdent.mockRejectedValue(new BadRequestError("bad"));
    const res = await request(makeApp())
      .post("/tracking/preview")
      .send({ ident: "LOT123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /tracking", () => {
  const validBody = {
    flightId: "11111111-1111-4111-8111-111111111111",
    source: "flight_number",
  };

  it("returns 201 with TrackedFlight DTO", async () => {
    confirmTrack.mockResolvedValue({ id: "tf-1" });
    const res = await request(makeApp()).post("/tracking").send(validBody);
    expect(res.status).toBe(201);
    expect(confirmTrack).toHaveBeenCalledWith(
      "user-1",
      validBody.flightId,
      "flight_number",
    );
  });

  it("returns 409 when already tracking", async () => {
    confirmTrack.mockRejectedValue(new ConflictError("dup"));
    const res = await request(makeApp()).post("/tracking").send(validBody);
    expect(res.status).toBe(409);
  });
});

describe("GET /tracking/me + /me/count", () => {
  it("returns the user's active flights", async () => {
    listMyFlights.mockResolvedValue([{ id: "tf-1" }]);
    const res = await request(makeApp()).get("/tracking/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "tf-1" }]);
  });

  it("returns count", async () => {
    countActive.mockResolvedValue(5);
    const res = await request(makeApp()).get("/tracking/me/count");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 5 });
  });
});

describe("DELETE /tracking/:id", () => {
  it("returns 204 on untrack", async () => {
    untrack.mockResolvedValue(undefined);
    const res = await request(makeApp()).delete("/tracking/abc");
    expect(res.status).toBe(204);
    expect(untrack).toHaveBeenCalledWith("user-1", "abc");
  });

  it("returns 404 when not found", async () => {
    untrack.mockRejectedValue(new NotFoundError("missing"));
    const res = await request(makeApp()).delete("/tracking/missing");
    expect(res.status).toBe(404);
  });
});

describe("History endpoints", () => {
  it("GET /tracking/history returns filtered results", async () => {
    listHistory.mockResolvedValue([{ id: "h1" }]);
    const res = await request(makeApp()).get(
      "/tracking/history?sort=oldest&year=2026",
    );
    expect(res.status).toBe(200);
    expect(listHistory).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ sort: "oldest", year: 2026 }),
    );
  });

  it("GET /tracking/history/export streams CSV", async () => {
    exportHistoryCsv.mockResolvedValue("data,ident\n2026-05-10,LOT123");
    const res = await request(makeApp()).get("/tracking/history/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("historia-lotow.csv");
    expect(res.text).toContain("data,ident");
  });

  it("DELETE /tracking/history/:id returns 204", async () => {
    deleteHistory.mockResolvedValue(undefined);
    const res = await request(makeApp()).delete("/tracking/history/h1");
    expect(res.status).toBe(204);
  });
});

describe("Notifications router", () => {
  it("GET / lists notifications as DTOs", async () => {
    listNotifications.mockResolvedValue([
      {
        id: "n1",
        type: "delay",
        title: "t",
        body: "b",
        link: null,
        trackedFlightId: null,
        readAt: null,
        createdAt: new Date("2026-05-10T08:00:00Z"),
      },
    ]);
    const res = await request(makeApp()).get("/notifications");
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ id: "n1", type: "delay" });
    expect(res.body[0].createdAt).toBe("2026-05-10T08:00:00.000Z");
  });

  it("GET /unread-count returns count", async () => {
    countUnread.mockResolvedValue(3);
    const res = await request(makeApp()).get("/notifications/unread-count");
    expect(res.body).toEqual({ count: 3 });
  });

  it("POST /:id/read returns 204 when ok", async () => {
    markNotificationRead.mockResolvedValue(true);
    const res = await request(makeApp()).post("/notifications/n1/read");
    expect(res.status).toBe(204);
  });

  it("POST /:id/read returns 404 when not found", async () => {
    markNotificationRead.mockResolvedValue(false);
    const res = await request(makeApp()).post("/notifications/n1/read");
    expect(res.status).toBe(404);
  });

  it("POST /read-all returns count", async () => {
    markAllNotificationsRead.mockResolvedValue(7);
    const res = await request(makeApp()).post("/notifications/read-all");
    expect(res.body).toEqual({ updated: 7 });
  });
});
