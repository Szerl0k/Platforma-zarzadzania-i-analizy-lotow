import { TrackingService } from "../tracking.service";
import { FlightsService } from "../../flights/flights.service";
import { Flight } from "../../flights/entities/Flight";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../common/errors/http-errors";
import {
  makeFlight,
  makeFlightHistory,
  makeFlightStatus,
  makeTrackedFlight,
  makeTrackingRepoMock,
  makeTrackingSource,
  makeTrackingStatus,
} from "./test-utils";

function makeDataSource(flightRepo: { findOne: jest.Mock }) {
  return {
    getRepository: jest.fn().mockImplementation((entity: unknown) => {
      if (entity === Flight) return flightRepo;
      throw new Error("Unexpected entity in test");
    }),
  };
}

describe("TrackingService.previewByIdent", () => {
  it("delegates to FlightsService and returns the result", async () => {
    const flightDto = {
      id: "f1",
      scheduledOut: "2026-05-10T08:00:00Z",
    } as never;
    const flightsService = {
      searchFlight: jest.fn().mockResolvedValue(flightDto),
    } as unknown as FlightsService;
    const service = new TrackingService(
      makeTrackingRepoMock() as never,
      flightsService,
      {} as never,
    );

    const result = await service.previewByIdent("LOT123");
    expect(result).toBe(flightDto);
    expect(flightsService.searchFlight).toHaveBeenCalledWith("LOT123");
  });

  it("throws BadRequest when departure date does not match", async () => {
    const flightsService = {
      searchFlight: jest.fn().mockResolvedValue({
        id: "f1",
        scheduledOut: "2026-05-11T08:00:00Z",
        estimatedOut: null,
        actualOut: null,
      }),
    } as unknown as FlightsService;
    const service = new TrackingService(
      makeTrackingRepoMock() as never,
      flightsService,
      {} as never,
    );
    await expect(
      service.previewByIdent("LOT123", "2026-05-10"),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("accepts matching departure date", async () => {
    const flightsService = {
      searchFlight: jest.fn().mockResolvedValue({
        id: "f1",
        scheduledOut: "2026-05-10T08:00:00Z",
      }),
    } as unknown as FlightsService;
    const service = new TrackingService(
      makeTrackingRepoMock() as never,
      flightsService,
      {} as never,
    );
    await expect(
      service.previewByIdent("LOT123", "2026-05-10"),
    ).resolves.toBeDefined();
  });
});

describe("TrackingService.confirmTrack", () => {
  function arrange(opts: {
    existing?: ReturnType<typeof makeTrackedFlight> | null;
    flight?: ReturnType<typeof makeFlight> | null;
    status?: ReturnType<typeof makeTrackingStatus> | null;
    source?: ReturnType<typeof makeTrackingSource> | null;
  }) {
    const repo = makeTrackingRepoMock();
    repo.findActiveByUserAndFlight.mockResolvedValue(opts.existing ?? null);
    repo.findStatusByName.mockResolvedValue(
      "status" in opts ? opts.status : makeTrackingStatus(),
    );
    repo.findSourceByName.mockResolvedValue(
      "source" in opts ? opts.source : makeTrackingSource(),
    );
    repo.create.mockResolvedValue(makeTrackedFlight());
    const flightRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue("flight" in opts ? opts.flight : makeFlight()),
    };
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      makeDataSource(flightRepo) as never,
    );
    return { repo, flightRepo, service };
  }

  it("creates a TrackedFlight when no active record exists", async () => {
    const { repo, service } = arrange({});
    const dto = await service.confirmTrack(
      "user-1",
      "flight-1",
      "flight_number",
    );
    expect(repo.create).toHaveBeenCalledWith({
      userId: "user-1",
      flightId: "flight-1",
      trackingStatusId: 1,
      sourceId: 1,
    });
    expect(dto.id).toBe("tracked-1");
  });

  it("throws ConflictError when already tracking", async () => {
    const { service } = arrange({ existing: makeTrackedFlight() });
    await expect(
      service.confirmTrack("user-1", "flight-1", "flight_number"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws NotFoundError when flight does not exist", async () => {
    const { service } = arrange({ flight: null });
    await expect(
      service.confirmTrack("user-1", "missing", "map_click"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when tracking_statuses.active missing", async () => {
    const { service } = arrange({ status: null });
    await expect(
      service.confirmTrack("user-1", "flight-1", "flight_number"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when tracking source missing", async () => {
    const { service } = arrange({ source: null });
    await expect(
      service.confirmTrack("user-1", "flight-1", "map_click"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("TrackingService listing & untrack", () => {
  it("listMyFlights maps repo entities to DTOs", async () => {
    const repo = makeTrackingRepoMock();
    repo.listActiveByUser.mockResolvedValue([makeTrackedFlight()]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    const dtos = await service.listMyFlights("user-1");
    expect(dtos).toHaveLength(1);
    expect(dtos[0].ident).toBe("LOT123");
    expect(dtos[0].bucket).toBe("scheduled");
  });

  it("countActive proxies to repo", async () => {
    const repo = makeTrackingRepoMock();
    repo.countActiveByUser.mockResolvedValue(3);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    expect(await service.countActive("user-1")).toBe(3);
  });

  it("untrack stops an active tracked flight", async () => {
    const repo = makeTrackingRepoMock();
    repo.findActiveById.mockResolvedValue(makeTrackedFlight());
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    await service.untrack("user-1", "tracked-1");
    expect(repo.markStopped).toHaveBeenCalledWith("tracked-1");
  });

  it("untrack throws NotFound when not active", async () => {
    const repo = makeTrackingRepoMock();
    repo.findActiveById.mockResolvedValue(null);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    await expect(service.untrack("user-1", "nope")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("TrackingService history", () => {
  it("filters by year, airline, country and sorts newest first", async () => {
    const repo = makeTrackingRepoMock();
    repo.listHistoryByUser.mockResolvedValue([
      makeFlightHistory({
        id: "h1",
        travelDate: "2025-01-01",
        flight: makeFlight({
          identIcao: "AAA",
          operatingAirline: { icaoCode: "LOT", name: "LOT" },
          destination: {
            city: { country: { name: "Polska" } },
          },
        } as never),
      }),
      makeFlightHistory({
        id: "h2",
        travelDate: "2026-06-01",
        flight: makeFlight({
          identIcao: "BBB",
          operatingAirline: { icaoCode: "LOT", name: "LOT" },
          destination: {
            city: { country: { name: "Polska" } },
          },
        } as never),
      }),
      makeFlightHistory({
        id: "h3",
        travelDate: "2026-03-01",
        flight: makeFlight({
          identIcao: "CCC",
          operatingAirline: { icaoCode: "RYR", name: "Ryanair" },
          destination: {
            city: { country: { name: "Niemcy" } },
          },
        } as never),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );

    const result = await service.listHistory("user-1", {
      sort: "newest",
      year: 2026,
      airlineIcao: "LOT",
      countryName: "Polska",
    });
    expect(result.map((r) => r.id)).toEqual(["h2"]);
  });

  it("sorts oldest and alpha correctly", async () => {
    const repo = makeTrackingRepoMock();
    repo.listHistoryByUser.mockResolvedValue([
      makeFlightHistory({
        id: "a",
        travelDate: "2026-03-01",
        flight: makeFlight({ identIcao: "ZZZ" } as never),
      }),
      makeFlightHistory({
        id: "b",
        travelDate: "2026-01-01",
        flight: makeFlight({ identIcao: "AAA" } as never),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );

    const oldest = await service.listHistory("user-1", { sort: "oldest" });
    expect(oldest.map((h) => h.id)).toEqual(["b", "a"]);

    const alpha = await service.listHistory("user-1", { sort: "alpha" });
    expect(alpha.map((h) => h.ident)).toEqual(["AAA", "ZZZ"]);
  });

  it("deleteHistory throws NotFound when nothing was deleted", async () => {
    const repo = makeTrackingRepoMock();
    repo.deleteHistoryById.mockResolvedValue(false);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    await expect(
      service.deleteHistory("user-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleteHistory succeeds when repo returns true", async () => {
    const repo = makeTrackingRepoMock();
    repo.deleteHistoryById.mockResolvedValue(true);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    await expect(
      service.deleteHistory("user-1", "ok"),
    ).resolves.toBeUndefined();
  });

  it("exportHistoryCsv produces a header + escaped rows", async () => {
    const repo = makeTrackingRepoMock();
    repo.listHistoryByUser.mockResolvedValue([
      makeFlightHistory({
        flight: makeFlight({
          identIcao: "LOT123",
          operatingAirline: { name: "LOT, Polish Airlines" },
        } as never),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    const csv = await service.exportHistoryCsv("user-1");
    const lines = csv.split("\n");
    expect(lines[0]).toContain("data,ident,linia");
    expect(lines[1]).toContain('"LOT, Polish Airlines"');
  });
});

describe("TrackingService bucket determination", () => {
  it("returns completed for terminal status", async () => {
    const repo = makeTrackingRepoMock();
    repo.listActiveByUser.mockResolvedValue([
      makeTrackedFlight({
        flight: makeFlight({
          actualIn: new Date("2026-05-10T10:00:00Z"),
        }),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    const dtos = await service.listMyFlights("user-1");
    expect(dtos[0].bucket).toBe("completed");
  });

  it("returns in_air when actualOut and no actualIn", async () => {
    const repo = makeTrackingRepoMock();
    repo.listActiveByUser.mockResolvedValue([
      makeTrackedFlight({
        flight: makeFlight({
          actualOut: new Date("2026-05-10T08:00:00Z"),
          actualIn: null,
          estimatedIn: new Date("2030-01-01T00:00:00Z"),
        }),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    const dtos = await service.listMyFlights("user-1");
    expect(dtos[0].bucket).toBe("in_air");
  });

  it("returns arriving_soon when ETA within 30 minutes", async () => {
    const now = new Date();
    const repo = makeTrackingRepoMock();
    repo.listActiveByUser.mockResolvedValue([
      makeTrackedFlight({
        flight: makeFlight({
          actualOut: new Date(now.getTime() - 60 * 60 * 1000),
          actualIn: null,
          estimatedIn: new Date(now.getTime() + 5 * 60 * 1000),
        }),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    const dtos = await service.listMyFlights("user-1");
    expect(dtos[0].bucket).toBe("arriving_soon");
  });

  it("returns completed when status name is Cancelled", async () => {
    const repo = makeTrackingRepoMock();
    repo.listActiveByUser.mockResolvedValue([
      makeTrackedFlight({
        flight: makeFlight({
          status: makeFlightStatus({ name: "Cancelled" }),
          actualOut: null,
          actualIn: null,
        }),
      }),
    ]);
    const service = new TrackingService(
      repo as never,
      {} as FlightsService,
      {} as never,
    );
    const dtos = await service.listMyFlights("user-1");
    expect(dtos[0].bucket).toBe("completed");
  });
});
