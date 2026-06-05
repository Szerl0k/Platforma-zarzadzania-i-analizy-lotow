import * as cron from "node-cron";
import { DataSource } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { logger } from "../common/utils/logger";
import type { FlightLookupPort } from "../common/contracts/flight-lookup.port";
import {
  resolveService,
  PORT_TOKENS,
} from "../common/contracts/service-registry";
import { Flight } from "../flights/entities/Flight";
import { User } from "../users/entities/User";
import { UserPreferences } from "../users/entities/UserPreferences";
import { TrackingRepository } from "./tracking.repository";
import { NotificationsService, detectChanges } from "./notifications.service";
import { isFlightTerminal } from "./tracking.service";
import { TrackedFlight } from "./entities/TrackedFlight";

const POLL_BATCH_LIMIT = 100;
// Poll interval is configurable so deployments can tune it to their external
// API quotas (OpenSky / AeroAPI). Set TRACKING_POLL_CRON to override.
const CRON_EXPR = process.env.TRACKING_POLL_CRON ?? "*/3 * * * *";

export interface SchedulerDeps {
  repo?: TrackingRepository;
  flightsService?: FlightLookupPort;
  notifications?: NotificationsService;
  dataSource?: DataSource;
  now?: () => Date;
}

export class TrackingScheduler {
  private isRunning = false;
  private task: cron.ScheduledTask | null = null;
  private readonly repo: TrackingRepository;
  private readonly flightsService: FlightLookupPort;
  private readonly notifications: NotificationsService;
  private readonly dataSource: DataSource;
  private readonly now: () => Date;

  constructor(deps: SchedulerDeps = {}) {
    this.repo = deps.repo ?? new TrackingRepository();
    this.flightsService =
      deps.flightsService ??
      resolveService<FlightLookupPort>(PORT_TOKENS.FlightLookup);
    this.notifications = deps.notifications ?? new NotificationsService();
    this.dataSource = deps.dataSource ?? AppDataSource;
    this.now = deps.now ?? (() => new Date());
  }

  start(): void {
    if (this.task) return;
    if (process.env.NODE_ENV === "test") return;
    if (process.env.TRACKING_POLL_ENABLED === "false") {
      logger.info("Tracking scheduler disabled (TRACKING_POLL_ENABLED=false)");
      return;
    }
    this.task = cron.schedule(CRON_EXPR, () => {
      this.tick().catch((err) => {
        logger.error("Tracking scheduler tick failed", err);
      });
    });
    logger.info(`Tracking scheduler started (cron: ${CRON_EXPR})`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  /**
   * Single poll iteration. Refreshes flight data for every active tracked
   * flight, persists detected changes, dispatches notifications, and turns
   * terminal flights into FlightHistory entries.
   *
   * Guarded by an in-memory mutex so overlapping ticks (slow AeroAPI) don't
   * pile up.
   */
  async tick(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Tracking scheduler tick skipped (still running)");
      return;
    }
    this.isRunning = true;
    try {
      const tracked = await this.repo.listAllActive(POLL_BATCH_LIMIT);
      for (const tf of tracked) {
        try {
          await this.processOne(tf);
        } catch (err) {
          logger.error(
            `Failed to process tracked flight ${tf.id}`,
            err as Error,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processOne(tracked: TrackedFlight): Promise<void> {
    const flight = tracked.flight;
    if (!flight) return;

    if (isFlightTerminal(flight)) {
      await this.archiveTerminal(tracked);
      return;
    }

    const ident = flight.identIcao || flight.callsign;
    if (!ident) return;

    const prevSnapshot = cloneFlight(flight);
    try {
      await this.flightsService.getFlightDetailsAndSave(ident);
    } catch (err) {
      logger.warn(
        `AeroAPI refresh failed for ${ident}: ${(err as Error).message}`,
      );
      return;
    }

    const fresh = await this.dataSource.getRepository(Flight).findOne({
      where: { id: flight.id },
      relations: ["status"],
    });
    if (!fresh) return;

    if (isFlightTerminal(fresh)) {
      tracked.flight = fresh;
      await this.archiveTerminal(tracked);
      return;
    }

    const prefs = await this.dataSource
      .getRepository(UserPreferences)
      .findOne({ where: { userId: tracked.userId } });
    if (!prefs) return;

    const changes = detectChanges(
      prevSnapshot,
      fresh,
      prefs.delayThresholdMinutes,
    );
    if (changes.length === 0) return;

    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: tracked.userId } });
    if (!user) return;

    for (const change of changes) {
      await this.notifications.recordAndDispatch(
        tracked,
        user,
        prefs,
        change,
        this.now(),
      );
    }
  }

  private async archiveTerminal(tracked: TrackedFlight): Promise<void> {
    const flight = tracked.flight;
    if (!flight) return;

    const existing = await this.repo.findHistoryByUserAndFlight(
      tracked.userId,
      tracked.flightId,
    );

    // Archiving a terminal flight is a two-step business transaction: create the
    // history entry and mark the tracked flight stopped — atomically.
    await this.dataSource.transaction(async (manager) => {
      if (!existing) {
        const travelDate = (
          flight.actualOut ??
          flight.scheduledOut ??
          this.now()
        )
          .toISOString()
          .slice(0, 10);
        const wasDelayed =
          flight.departureDelay != null
            ? flight.departureDelay >= 15 * 60
            : null;
        const delayMinutes =
          flight.departureDelay != null
            ? Math.round(flight.departureDelay / 60)
            : null;
        await this.repo.createHistory(
          {
            userId: tracked.userId,
            flightId: tracked.flightId,
            travelDate,
            wasDelayed,
            delayMinutes,
          },
          manager,
        );
      }

      await this.repo.markStopped(tracked.id, this.now(), manager);
    });
  }
}

function cloneFlight(flight: Flight): Flight {
  const copy = Object.assign(
    Object.create(Object.getPrototypeOf(flight)),
    flight,
  );
  if (flight.status) {
    copy.status = { ...flight.status };
  }
  return copy as Flight;
}

let scheduler: TrackingScheduler | null = null;

export function getTrackingScheduler(): TrackingScheduler {
  if (!scheduler) scheduler = new TrackingScheduler();
  return scheduler;
}
