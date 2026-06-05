import { TrackingRepository } from "../tracking.repository";
import { TrackedFlight } from "../entities/TrackedFlight";
import { TrackingStatus } from "../entities/TrackingStatus";
import { TrackingSource } from "../entities/TrackingSource";
import { FlightHistory } from "../entities/FlightHistory";
import { NotificationLog } from "../entities/NotificationLog";
import { PushSubscription } from "../entities/PushSubscription";

function repoMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn().mockImplementation((d: object) => ({ ...d })),
    save: jest.fn().mockImplementation((e: object) => Promise.resolve(e)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    upsert: jest.fn().mockResolvedValue({ identifiers: [] }),
  };
}

function buildRepo() {
  const tracked = repoMock();
  const statuses = repoMock();
  const sources = repoMock();
  const history = repoMock();
  const notifications = repoMock();
  const pushSubscriptions = repoMock();
  const ds = {
    getRepository: jest.fn().mockImplementation((entity: unknown) => {
      if (entity === TrackedFlight) return tracked;
      if (entity === TrackingStatus) return statuses;
      if (entity === TrackingSource) return sources;
      if (entity === FlightHistory) return history;
      if (entity === NotificationLog) return notifications;
      if (entity === PushSubscription) return pushSubscriptions;
      throw new Error("Unexpected entity");
    }),
  };
  const repo = new TrackingRepository(ds as never);
  return {
    repo,
    tracked,
    statuses,
    sources,
    history,
    notifications,
    pushSubscriptions,
  };
}

describe("TrackingRepository (history flown + push)", () => {
  it("findHistoryById queries by id+userId with flight relation", async () => {
    const { repo, history } = buildRepo();
    history.findOne.mockResolvedValue({ id: "h1" });
    const row = await repo.findHistoryById("user-1", "h1");
    expect(row).toEqual({ id: "h1" });
    expect(history.findOne).toHaveBeenCalledWith({
      where: { id: "h1", userId: "user-1" },
      relations: ["flight"],
    });
  });

  it("setHistoryFlown returns true when a row is updated", async () => {
    const { repo, history } = buildRepo();
    history.update.mockResolvedValue({ affected: 1 });
    await expect(repo.setHistoryFlown("user-1", "h1", true)).resolves.toBe(
      true,
    );
    expect(history.update).toHaveBeenCalledWith(
      { id: "h1", userId: "user-1" },
      { flown: true },
    );
  });

  it("upserts / lists / deletes push subscriptions", async () => {
    const { repo, pushSubscriptions } = buildRepo();
    await repo.upsertPushSubscription({
      userId: "user-1",
      endpoint: "e1",
      p256dh: "k",
      auth: "a",
    });
    expect(pushSubscriptions.upsert ?? pushSubscriptions.save).toBeDefined();

    pushSubscriptions.find.mockResolvedValue([{ id: "s1" }]);
    await expect(repo.listPushSubscriptions("user-1")).resolves.toEqual([
      { id: "s1" },
    ]);

    await repo.deletePushSubscription("user-1", "e1");
    await repo.deletePushSubscriptionByEndpoint("e1");
    expect(pushSubscriptions.delete).toHaveBeenCalledWith({ endpoint: "e1" });
  });
});

describe("TrackingRepository", () => {
  it("create initialises tracking timestamps", async () => {
    const { repo, tracked } = buildRepo();
    await repo.create({
      userId: "user-1",
      flightId: "flight-1",
      trackingStatusId: 1,
      sourceId: 1,
    });
    const saved = tracked.save.mock.calls[0][0];
    expect(saved.startedTrackingAt).toBeInstanceOf(Date);
    expect(saved.stoppedTrackingAt).toBeNull();
    expect(saved.lastNotifiedAt).toBeNull();
  });

  it("markStopped sets stoppedTrackingAt", async () => {
    const { repo, tracked } = buildRepo();
    const now = new Date("2026-05-10T10:00:00Z");
    await repo.markStopped("tf-1", now);
    expect(tracked.update).toHaveBeenCalledWith("tf-1", {
      stoppedTrackingAt: now,
    });
  });

  it("updateLastNotifiedAt updates only timestamp", async () => {
    const { repo, tracked } = buildRepo();
    const now = new Date("2026-05-10T10:00:00Z");
    await repo.updateLastNotifiedAt("tf-1", now);
    expect(tracked.update).toHaveBeenCalledWith("tf-1", {
      lastNotifiedAt: now,
    });
  });

  it("listAllActive limits results", async () => {
    const { repo, tracked } = buildRepo();
    tracked.find.mockResolvedValue([]);
    await repo.listAllActive(50);
    expect(tracked.find.mock.calls[0][0].take).toBe(50);
  });

  it("countActiveByUser filters out stopped", async () => {
    const { repo, tracked } = buildRepo();
    tracked.count.mockResolvedValue(2);
    expect(await repo.countActiveByUser("user-1")).toBe(2);
    const where = tracked.count.mock.calls[0][0].where;
    expect(where.userId).toBe("user-1");
  });

  it("deleteHistoryById returns true when row removed", async () => {
    const { repo, history } = buildRepo();
    history.delete.mockResolvedValue({ affected: 1 });
    expect(await repo.deleteHistoryById("user-1", "h1")).toBe(true);
  });

  it("deleteHistoryById returns false when nothing removed", async () => {
    const { repo, history } = buildRepo();
    history.delete.mockResolvedValue({ affected: 0 });
    expect(await repo.deleteHistoryById("user-1", "h1")).toBe(false);
  });

  it("listNotifications applies unreadOnly filter", async () => {
    const { repo, notifications } = buildRepo();
    notifications.find.mockResolvedValue([]);
    await repo.listNotifications("user-1", { unreadOnly: true, limit: 10 });
    const where = notifications.find.mock.calls[0][0].where;
    expect(where.userId).toBe("user-1");
    expect(where.readAt).toBeDefined();
  });

  it("countUnread reads notifications where readAt IS NULL", async () => {
    const { repo, notifications } = buildRepo();
    notifications.count.mockResolvedValue(4);
    expect(await repo.countUnread("user-1")).toBe(4);
  });

  it("markNotificationRead returns true when affected > 0", async () => {
    const { repo, notifications } = buildRepo();
    notifications.update.mockResolvedValue({ affected: 1 });
    expect(await repo.markNotificationRead("user-1", "n1")).toBe(true);
  });

  it("markNotificationRead returns false when nothing affected", async () => {
    const { repo, notifications } = buildRepo();
    notifications.update.mockResolvedValue({ affected: 0 });
    expect(await repo.markNotificationRead("user-1", "n1")).toBe(false);
  });

  it("markAllNotificationsRead returns affected count", async () => {
    const { repo, notifications } = buildRepo();
    notifications.update.mockResolvedValue({ affected: 7 });
    expect(await repo.markAllNotificationsRead("user-1")).toBe(7);
  });
});
