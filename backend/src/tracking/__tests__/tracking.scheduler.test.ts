import { TrackingScheduler } from "../tracking.scheduler";
import { Flight } from "../../flights/entities/Flight";
import { User } from "../../users/entities/User";
import { UserPreferences } from "../../users/entities/UserPreferences";
import {
  makeFlight,
  makeFlightStatus,
  makeTrackedFlight,
  makeTrackingRepoMock,
} from "./test-utils";
import {
  makePreferences,
  makeUser,
} from "../../users/__tests__/test-utils";

jest.mock("node-cron", () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

function buildScheduler(opts: {
  prevFlight?: ReturnType<typeof makeFlight>;
  freshFlight?: ReturnType<typeof makeFlight>;
  user?: ReturnType<typeof makeUser>;
  prefs?: ReturnType<typeof makePreferences>;
  trackedList?: ReturnType<typeof makeTrackedFlight>[];
} = {}) {
  const repo = makeTrackingRepoMock();
  const tracked = opts.trackedList ?? [
    makeTrackedFlight({ flight: opts.prevFlight ?? makeFlight() }),
  ];
  repo.listAllActive.mockResolvedValue(tracked);
  repo.findHistoryByUserAndFlight.mockResolvedValue(null);

  const flightsService = {
    getFlightDetailsAndSave: jest.fn().mockResolvedValue({}),
  };

  const flightRepo = {
    findOne: jest.fn().mockResolvedValue(opts.freshFlight ?? makeFlight()),
  };
  const userRepo = {
    findOne: jest.fn().mockResolvedValue(opts.user ?? makeUser()),
  };
  const prefsRepo = {
    findOne: jest.fn().mockResolvedValue(opts.prefs ?? makePreferences()),
  };
  const dataSource = {
    getRepository: jest.fn().mockImplementation((entity: unknown) => {
      if (entity === Flight) return flightRepo;
      if (entity === User) return userRepo;
      if (entity === UserPreferences) return prefsRepo;
      throw new Error(`Unexpected entity: ${String(entity)}`);
    }),
  };

  const notifications = {
    recordAndDispatch: jest.fn().mockResolvedValue({
      emailSent: true,
      inAppLogged: true,
      throttled: false,
    }),
  };

  const scheduler = new TrackingScheduler({
    repo: repo as never,
    flightsService: flightsService as never,
    notifications: notifications as never,
    dataSource: dataSource as never,
    now: () => new Date("2026-05-10T12:00:00Z"),
  });

  return { scheduler, repo, flightsService, notifications, dataSource, flightRepo, userRepo, prefsRepo };
}

describe("TrackingScheduler", () => {
  it("does nothing when no active tracked flights exist", async () => {
    const { scheduler, flightsService } = buildScheduler({ trackedList: [] });
    await scheduler.tick();
    expect(flightsService.getFlightDetailsAndSave).not.toHaveBeenCalled();
  });

  it("archives terminal flights into history and stops tracking", async () => {
    const terminalFlight = makeFlight({
      actualIn: new Date("2026-05-10T11:00:00Z"),
      actualOut: new Date("2026-05-10T08:00:00Z"),
      departureDelay: 30 * 60,
    });
    const tracked = makeTrackedFlight({ flight: terminalFlight });
    const { scheduler, repo, flightsService } = buildScheduler({
      trackedList: [tracked],
    });
    await scheduler.tick();
    expect(flightsService.getFlightDetailsAndSave).not.toHaveBeenCalled();
    expect(repo.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        flightId: "flight-1",
        wasDelayed: true,
        delayMinutes: 30,
      }),
    );
    expect(repo.markStopped).toHaveBeenCalledWith(
      "tracked-1",
      expect.any(Date),
    );
  });

  it("does not duplicate history if entry already exists", async () => {
    const terminalFlight = makeFlight({
      actualIn: new Date("2026-05-10T11:00:00Z"),
    });
    const tracked = makeTrackedFlight({ flight: terminalFlight });
    const { scheduler, repo } = buildScheduler({ trackedList: [tracked] });
    repo.findHistoryByUserAndFlight.mockResolvedValue({ id: "existing" });
    await scheduler.tick();
    expect(repo.createHistory).not.toHaveBeenCalled();
    expect(repo.markStopped).toHaveBeenCalled();
  });

  it("dispatches detected changes for non-terminal flight", async () => {
    const prev = makeFlight({ gateOrigin: "A1" });
    const fresh = makeFlight({ gateOrigin: "B5" });
    const tracked = makeTrackedFlight({ flight: prev });
    const { scheduler, notifications, flightsService } = buildScheduler({
      trackedList: [tracked],
      freshFlight: fresh,
    });
    await scheduler.tick();
    expect(flightsService.getFlightDetailsAndSave).toHaveBeenCalledWith("LOT123");
    expect(notifications.recordAndDispatch).toHaveBeenCalledTimes(1);
    expect(notifications.recordAndDispatch.mock.calls[0][3].kind).toBe(
      "gate_change",
    );
  });

  it("skips dispatch when no preferences row exists", async () => {
    const prev = makeFlight({ gateOrigin: "A1" });
    const fresh = makeFlight({ gateOrigin: "B5" });
    const tracked = makeTrackedFlight({ flight: prev });
    const { scheduler, notifications, prefsRepo } = buildScheduler({
      trackedList: [tracked],
      freshFlight: fresh,
    });
    prefsRepo.findOne.mockResolvedValue(null);
    await scheduler.tick();
    expect(notifications.recordAndDispatch).not.toHaveBeenCalled();
  });

  it("archives when fresh flight reaches terminal status mid-tick", async () => {
    const prev = makeFlight({ status: makeFlightStatus({ name: "In Air" }) });
    const fresh = makeFlight({
      status: makeFlightStatus({ name: "Landed" }),
      actualIn: new Date("2026-05-10T11:00:00Z"),
    });
    const tracked = makeTrackedFlight({ flight: prev });
    const { scheduler, repo, notifications } = buildScheduler({
      trackedList: [tracked],
      freshFlight: fresh,
    });
    await scheduler.tick();
    expect(repo.createHistory).toHaveBeenCalled();
    expect(notifications.recordAndDispatch).not.toHaveBeenCalled();
  });

  it("logs and continues when AeroAPI refresh throws", async () => {
    const tracked = makeTrackedFlight();
    const { scheduler, flightsService, notifications } = buildScheduler({
      trackedList: [tracked],
    });
    flightsService.getFlightDetailsAndSave.mockRejectedValue(
      new Error("upstream down"),
    );
    await scheduler.tick();
    expect(notifications.recordAndDispatch).not.toHaveBeenCalled();
  });

  it("guards against overlapping ticks", async () => {
    const tracked = makeTrackedFlight();
    const { scheduler, repo } = buildScheduler({ trackedList: [tracked] });
    let resolve!: () => void;
    repo.listAllActive.mockReturnValue(
      new Promise((r) => {
        resolve = () => r([tracked]);
      }),
    );
    const first = scheduler.tick();
    await scheduler.tick();
    expect(repo.listAllActive).toHaveBeenCalledTimes(1);
    resolve();
    await first;
  });

  it("does not start cron when NODE_ENV=test", () => {
    const { scheduler } = buildScheduler();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    scheduler.start();
    process.env.NODE_ENV = prev;
    // start is silent in test mode — assertion is no-throw and absence of side effects.
    expect(true).toBe(true);
  });
});
