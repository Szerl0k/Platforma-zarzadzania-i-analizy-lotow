import { DataSource, IsNull, Repository } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { TrackedFlight } from "./entities/TrackedFlight";
import { TrackingStatus } from "./entities/TrackingStatus";
import { TrackingSource } from "./entities/TrackingSource";
import { FlightHistory } from "./entities/FlightHistory";
import { NotificationLog } from "./entities/NotificationLog";

const FLIGHT_RELATIONS = [
  "flight",
  "flight.status",
  "flight.origin",
  "flight.origin.city",
  "flight.origin.city.country",
  "flight.destination",
  "flight.destination.city",
  "flight.destination.city.country",
  "flight.operatingAirline",
];

export class TrackingRepository {
  private readonly trackedFlights: Repository<TrackedFlight>;
  private readonly trackingStatuses: Repository<TrackingStatus>;
  private readonly trackingSources: Repository<TrackingSource>;
  private readonly flightHistory: Repository<FlightHistory>;
  private readonly notifications: Repository<NotificationLog>;

  constructor(dataSource: DataSource = AppDataSource) {
    this.trackedFlights = dataSource.getRepository(TrackedFlight);
    this.trackingStatuses = dataSource.getRepository(TrackingStatus);
    this.trackingSources = dataSource.getRepository(TrackingSource);
    this.flightHistory = dataSource.getRepository(FlightHistory);
    this.notifications = dataSource.getRepository(NotificationLog);
  }

  async findActiveByUserAndFlight(
    userId: string,
    flightId: string,
  ): Promise<TrackedFlight | null> {
    return this.trackedFlights.findOne({
      where: { userId, flightId, stoppedTrackingAt: IsNull() },
    });
  }

  async findActiveById(
    userId: string,
    id: string,
  ): Promise<TrackedFlight | null> {
    return this.trackedFlights.findOne({
      where: { id, userId, stoppedTrackingAt: IsNull() },
    });
  }

  async listActiveByUser(userId: string): Promise<TrackedFlight[]> {
    return this.trackedFlights.find({
      where: { userId, stoppedTrackingAt: IsNull() },
      relations: FLIGHT_RELATIONS,
      order: { startedTrackingAt: "DESC" },
    });
  }

  async countActiveByUser(userId: string): Promise<number> {
    return this.trackedFlights.count({
      where: { userId, stoppedTrackingAt: IsNull() },
    });
  }

  async listAllActive(limit: number): Promise<TrackedFlight[]> {
    return this.trackedFlights.find({
      where: { stoppedTrackingAt: IsNull() },
      relations: ["flight", "flight.status", "user"],
      take: limit,
      order: { startedTrackingAt: "ASC" },
    });
  }

  async create(
    data: Pick<
      TrackedFlight,
      "userId" | "flightId" | "trackingStatusId" | "sourceId"
    >,
  ): Promise<TrackedFlight> {
    const entity = this.trackedFlights.create({
      ...data,
      startedTrackingAt: new Date(),
      stoppedTrackingAt: null,
      lastNotifiedAt: null,
    });
    return this.trackedFlights.save(entity);
  }

  async markStopped(id: string, now: Date = new Date()): Promise<void> {
    await this.trackedFlights.update(id, { stoppedTrackingAt: now });
  }

  async updateLastNotifiedAt(id: string, now: Date): Promise<void> {
    await this.trackedFlights.update(id, { lastNotifiedAt: now });
  }

  async findStatusByName(name: string): Promise<TrackingStatus | null> {
    return this.trackingStatuses.findOne({ where: { name } });
  }

  async findSourceByName(name: string): Promise<TrackingSource | null> {
    return this.trackingSources.findOne({ where: { name } });
  }

  // History
  async createHistory(data: Partial<FlightHistory>): Promise<FlightHistory> {
    const entity = this.flightHistory.create(data);
    return this.flightHistory.save(entity);
  }

  async findHistoryByUserAndFlight(
    userId: string,
    flightId: string,
  ): Promise<FlightHistory | null> {
    return this.flightHistory.findOne({ where: { userId, flightId } });
  }

  async listHistoryByUser(userId: string): Promise<FlightHistory[]> {
    return this.flightHistory.find({
      where: { userId },
      relations: [
        "flight",
        "flight.origin",
        "flight.origin.city",
        "flight.origin.city.country",
        "flight.destination",
        "flight.destination.city",
        "flight.destination.city.country",
        "flight.operatingAirline",
      ],
      order: { travelDate: "DESC" },
    });
  }

  async deleteHistoryById(userId: string, id: string): Promise<boolean> {
    const result = await this.flightHistory.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  // Notifications
  async insertNotification(
    data: Partial<NotificationLog>,
  ): Promise<NotificationLog> {
    const entity = this.notifications.create(data);
    return this.notifications.save(entity);
  }

  async listNotifications(
    userId: string,
    opts: { unreadOnly?: boolean; limit: number },
  ): Promise<NotificationLog[]> {
    const where: Record<string, unknown> = { userId };
    if (opts.unreadOnly) where.readAt = IsNull();
    return this.notifications.find({
      where,
      order: { createdAt: "DESC" },
      take: opts.limit,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifications.count({ where: { userId, readAt: IsNull() } });
  }

  async markNotificationRead(
    userId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const result = await this.notifications.update(
      { id, userId, readAt: IsNull() },
      { readAt: now },
    );
    return (result.affected ?? 0) > 0;
  }

  async markAllNotificationsRead(
    userId: string,
    now: Date = new Date(),
  ): Promise<number> {
    const result = await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: now },
    );
    return result.affected ?? 0;
  }
}
