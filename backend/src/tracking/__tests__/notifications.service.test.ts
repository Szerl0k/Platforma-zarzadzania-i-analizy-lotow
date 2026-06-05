import {
  detectChanges,
  isAllowedByPrefs,
  NotificationsService,
} from "../notifications.service";
import { FlightChangeType } from "../../flights/entities/FlightChangeType";
import { FlightStatusChange } from "../../flights/entities/FlightStatusChange";
import {
  makeFlight,
  makeFlightStatus,
  makeTrackedFlight,
  makeTrackingRepoMock,
} from "./test-utils";
import {
  makePreferences,
  makeUser,
  makeMailer,
} from "../../users/__tests__/test-utils";

function makeFlightChangeType(name: string): FlightChangeType {
  return {
    id: 99,
    name,
    description: name,
    createdAt: new Date("2026-05-10T00:00:00Z"),
    updatedAt: new Date("2026-05-10T00:00:00Z"),
  } as FlightChangeType;
}

function makeDataSource(opts: {
  changeType?: FlightChangeType | null;
  saveStatusChange?: jest.Mock;
  updateStatusChange?: jest.Mock;
}) {
  const changeTypeValue =
    opts.changeType === undefined
      ? makeFlightChangeType("delay_update")
      : opts.changeType;
  const changeTypeRepo = {
    findOne: jest.fn().mockResolvedValue(changeTypeValue),
  };
  const saveMock =
    opts.saveStatusChange ??
    jest
      .fn()
      .mockImplementation((data: object) =>
        Promise.resolve({ id: "sc-1", ...data }),
      );
  const updateMock =
    opts.updateStatusChange ?? jest.fn().mockResolvedValue(undefined);
  const statusChangeRepo = { save: saveMock, update: updateMock };
  const getRepository = jest.fn().mockImplementation((entity: unknown) => {
    if (entity === FlightChangeType) return changeTypeRepo;
    if (entity === FlightStatusChange) return statusChangeRepo;
    throw new Error(`Unexpected entity: ${String(entity)}`);
  });
  return {
    getRepository,
    transaction: jest.fn(
      async (cb: (m: { getRepository: jest.Mock }) => unknown) =>
        cb({ getRepository }),
    ),
  };
}

describe("detectChanges", () => {
  const baseline = makeFlight({
    gateOrigin: "A1",
    gateDestination: "B2",
    departureDelay: 0,
    arrivalDelay: 0,
    status: makeFlightStatus({ name: "Scheduled" }),
  });

  it("returns empty array for unchanged flight", () => {
    expect(detectChanges(baseline, baseline, 15)).toEqual([]);
  });

  it("emits gate_change for departure gate", () => {
    const fresh = makeFlight({ ...baseline, gateOrigin: "C5" } as never);
    const changes = detectChanges(baseline, fresh, 15);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("gate_change");
    expect(changes[0].newValue).toBe("C5");
  });

  it("emits gate_change for arrival gate", () => {
    const fresh = makeFlight({ ...baseline, gateDestination: "D9" } as never);
    const changes = detectChanges(baseline, fresh, 15);
    expect(changes[0].kind).toBe("gate_change");
    expect(changes[0].description).toContain("Bramka przylotu");
  });

  it("ignores delay below threshold", () => {
    const fresh = makeFlight({ ...baseline, departureDelay: 600 } as never);
    expect(detectChanges(baseline, fresh, 15)).toEqual([]);
  });

  it("emits delay when departure delay crosses threshold", () => {
    const fresh = makeFlight({ ...baseline, departureDelay: 1500 } as never);
    const changes = detectChanges(baseline, fresh, 15);
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("delay");
    expect(changes[0].newValue).toBe("25 min");
  });

  it("emits arrival delay separately", () => {
    const fresh = makeFlight({
      ...baseline,
      arrivalDelay: 1200,
    } as never);
    const changes = detectChanges(baseline, fresh, 15);
    expect(changes.map((c) => c.description)).toContain(
      "Opóźnienie przylotu wzrosło do 20 min.",
    );
  });

  it("does not emit delay when delta is below threshold", () => {
    const prev = makeFlight({ ...baseline, departureDelay: 1500 } as never);
    const fresh = makeFlight({ ...baseline, departureDelay: 1700 } as never);
    expect(detectChanges(prev, fresh, 15)).toEqual([]);
  });

  it("emits status_change", () => {
    const fresh = makeFlight({
      ...baseline,
      status: makeFlightStatus({ name: "Boarding" }),
    } as never);
    const changes = detectChanges(baseline, fresh, 15);
    expect(changes[0].kind).toBe("status_change");
  });

  it("emits cancellation kind when status name contains 'cancel'", () => {
    const fresh = makeFlight({
      ...baseline,
      status: makeFlightStatus({ name: "Cancelled" }),
    } as never);
    const changes = detectChanges(baseline, fresh, 15);
    expect(changes[0].kind).toBe("cancellation");
  });
});

describe("isAllowedByPrefs", () => {
  it("respects per-kind preference flags", () => {
    const prefs = makePreferences({
      notifyOnDelay: false,
      notifyOnGateChange: true,
      notifyOnStatusChange: false,
    });
    expect(isAllowedByPrefs("delay", prefs)).toBe(false);
    expect(isAllowedByPrefs("gate_change", prefs)).toBe(true);
    expect(isAllowedByPrefs("status_change", prefs)).toBe(false);
    expect(isAllowedByPrefs("cancellation", prefs)).toBe(false);
  });
});

describe("NotificationsService.recordAndDispatch", () => {
  const change = {
    kind: "delay" as const,
    changeTypeName: "delay_update",
    oldValue: "0 min",
    newValue: "25 min",
    description: "Opóźnienie wylotu wzrosło do 25 min.",
  };

  function arrange(
    opts: {
      prefs?: ReturnType<typeof makePreferences>;
      tracked?: ReturnType<typeof makeTrackedFlight>;
      changeType?: FlightChangeType | null;
      mailerThrows?: boolean;
    } = {},
  ) {
    const repo = makeTrackingRepoMock();
    repo.insertNotification.mockResolvedValue({ id: "n1" });
    repo.updateLastNotifiedAt.mockResolvedValue(undefined);
    const dataSource = makeDataSource({ changeType: opts.changeType });
    const mailer = makeMailer();
    if (opts.mailerThrows) {
      mailer.sendFlightNotification.mockRejectedValue(new Error("smtp down"));
    }
    const service = new NotificationsService(
      repo as never,
      dataSource as never,
      () => mailer,
      () => "http://app.local",
    );
    return {
      repo,
      mailer,
      dataSource,
      service,
      tracked: opts.tracked ?? makeTrackedFlight(),
      prefs: opts.prefs ?? makePreferences(),
      user: makeUser(),
    };
  }

  it("skips entirely when change type seed missing", async () => {
    const { service, repo, tracked, prefs, user, mailer } = arrange({
      changeType: null,
    });
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
    );
    expect(result).toEqual({
      emailSent: false,
      inAppLogged: false,
      throttled: false,
    });
    expect(repo.insertNotification).not.toHaveBeenCalled();
    expect(mailer.sendFlightNotification).not.toHaveBeenCalled();
  });

  it("sends email and logs in-app when prefs allow and not throttled", async () => {
    const { service, repo, tracked, prefs, user, mailer } = arrange();
    const now = new Date("2026-05-10T12:00:00Z");
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
      now,
    );
    expect(result.emailSent).toBe(true);
    expect(result.inAppLogged).toBe(true);
    expect(result.throttled).toBe(false);
    expect(mailer.sendFlightNotification).toHaveBeenCalledWith(
      "john@example.com",
      expect.objectContaining({ ident: "LOT123", changeKind: "delay" }),
    );
    expect(repo.insertNotification).toHaveBeenCalled();
    expect(repo.updateLastNotifiedAt).toHaveBeenCalledWith(
      "tracked-1",
      now,
      expect.anything(),
    );
  });

  it("respects per-kind preferences (delay disabled)", async () => {
    const prefs = makePreferences({ notifyOnDelay: false });
    const { service, repo, tracked, user, mailer } = arrange({ prefs });
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
    );
    expect(result).toEqual({
      emailSent: false,
      inAppLogged: false,
      throttled: false,
    });
    expect(mailer.sendFlightNotification).not.toHaveBeenCalled();
    expect(repo.insertNotification).not.toHaveBeenCalled();
  });

  it("throttles within 5 minutes of lastNotifiedAt", async () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const tracked = makeTrackedFlight({
      lastNotifiedAt: new Date(now.getTime() - 60 * 1000),
    });
    const { service, repo, prefs, user, mailer } = arrange({ tracked });
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
      now,
    );
    expect(result.throttled).toBe(true);
    expect(mailer.sendFlightNotification).not.toHaveBeenCalled();
    expect(repo.insertNotification).not.toHaveBeenCalled();
  });

  it("does not throttle when lastNotifiedAt older than 5 minutes", async () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const tracked = makeTrackedFlight({
      lastNotifiedAt: new Date(now.getTime() - 10 * 60 * 1000),
    });
    const { service, prefs, user, mailer } = arrange({ tracked });
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
      now,
    );
    expect(result.throttled).toBe(false);
    expect(mailer.sendFlightNotification).toHaveBeenCalled();
  });

  it("still logs in-app when email fails", async () => {
    const { service, repo, tracked, prefs, user } = arrange({
      mailerThrows: true,
    });
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
    );
    expect(result.emailSent).toBe(false);
    expect(result.inAppLogged).toBe(true);
    expect(repo.insertNotification).toHaveBeenCalled();
  });

  it("does not send email when emailNotifications disabled but still logs in-app", async () => {
    const prefs = makePreferences({ emailNotifications: false });
    const { service, repo, tracked, user, mailer } = arrange({ prefs });
    const result = await service.recordAndDispatch(
      tracked,
      user,
      prefs,
      change,
    );
    expect(mailer.sendFlightNotification).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
    expect(result.inAppLogged).toBe(true);
    expect(repo.insertNotification).toHaveBeenCalled();
  });
});
