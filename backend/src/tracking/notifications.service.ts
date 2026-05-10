import { DataSource } from "typeorm";
import { AppDataSource } from "../common/database/data-source";
import { logger } from "../common/utils/logger";
import {
  Mailer,
  FlightChangeKind,
  FlightNotificationPayload,
  getMailer,
  getAppBaseUrl,
} from "../users/mailer";
import { UserPreferences } from "../users/entities/UserPreferences";
import { User } from "../users/entities/User";
import { Flight } from "../flights/entities/Flight";
import { FlightStatusChange } from "../flights/entities/FlightStatusChange";
import { FlightChangeType } from "../flights/entities/FlightChangeType";
import { TrackedFlight } from "./entities/TrackedFlight";
import { TrackingRepository } from "./tracking.repository";

const THROTTLE_MS = 5 * 60 * 1000;

export interface DetectedChange {
  kind: FlightChangeKind;
  changeTypeName: string;
  oldValue: string | null;
  newValue: string | null;
  description: string;
}

/**
 * Compares previous and fresh flight snapshots and returns changes that
 * may warrant a user-facing notification.
 *
 * `delayThresholdMinutes` is the user's tolerance — only delays exceeding
 * it (delta from previous reading) are reported.
 */
export function detectChanges(
  prev: Flight,
  fresh: Flight,
  delayThresholdMinutes: number,
): DetectedChange[] {
  const out: DetectedChange[] = [];
  const thresholdSec = delayThresholdMinutes * 60;

  if (prev.gateOrigin !== fresh.gateOrigin && fresh.gateOrigin) {
    out.push({
      kind: "gate_change",
      changeTypeName: "gate_change",
      oldValue: prev.gateOrigin,
      newValue: fresh.gateOrigin,
      description: `Bramka wylotu: ${prev.gateOrigin ?? "?"} → ${fresh.gateOrigin}`,
    });
  }
  if (prev.gateDestination !== fresh.gateDestination && fresh.gateDestination) {
    out.push({
      kind: "gate_change",
      changeTypeName: "gate_change",
      oldValue: prev.gateDestination,
      newValue: fresh.gateDestination,
      description: `Bramka przylotu: ${prev.gateDestination ?? "?"} → ${fresh.gateDestination}`,
    });
  }

  const prevDeparture = prev.departureDelay ?? 0;
  const freshDeparture = fresh.departureDelay ?? 0;
  if (
    freshDeparture - prevDeparture >= thresholdSec &&
    freshDeparture >= thresholdSec
  ) {
    out.push({
      kind: "delay",
      changeTypeName: "delay_update",
      oldValue: minutesLabel(prevDeparture),
      newValue: minutesLabel(freshDeparture),
      description: `Opóźnienie wylotu wzrosło do ${Math.round(freshDeparture / 60)} min.`,
    });
  }

  const prevArrival = prev.arrivalDelay ?? 0;
  const freshArrival = fresh.arrivalDelay ?? 0;
  if (
    freshArrival - prevArrival >= thresholdSec &&
    freshArrival >= thresholdSec
  ) {
    out.push({
      kind: "delay",
      changeTypeName: "delay_update",
      oldValue: minutesLabel(prevArrival),
      newValue: minutesLabel(freshArrival),
      description: `Opóźnienie przylotu wzrosło do ${Math.round(freshArrival / 60)} min.`,
    });
  }

  const prevStatus = prev.status?.name ?? null;
  const freshStatus = fresh.status?.name ?? null;
  if (prevStatus !== freshStatus && freshStatus) {
    const isCancellation = /cancel/i.test(freshStatus);
    out.push({
      kind: isCancellation ? "cancellation" : "status_change",
      changeTypeName: isCancellation ? "cancellation" : "status_change",
      oldValue: prevStatus,
      newValue: freshStatus,
      description: `Status: ${prevStatus ?? "?"} → ${freshStatus}.`,
    });
  }

  return out;
}

function minutesLabel(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

export interface DispatchOutcome {
  emailSent: boolean;
  inAppLogged: boolean;
  throttled: boolean;
}

export class NotificationsService {
  constructor(
    private readonly repo: TrackingRepository = new TrackingRepository(),
    private readonly dataSource: DataSource = AppDataSource,
    private readonly mailerFactory: () => Mailer = getMailer,
    private readonly appBaseUrlFactory: () => string = getAppBaseUrl,
  ) {}

  /**
   * Persists a FlightStatusChange for the given tracked flight and dispatches
   * email + in-app notifications respecting user preferences and a 5-minute
   * throttle (per tracked flight). The throttle prevents spam when AeroAPI
   * pushes multiple ticks of the same delay quickly.
   */
  async recordAndDispatch(
    tracked: TrackedFlight,
    user: User,
    prefs: UserPreferences,
    change: DetectedChange,
    now: Date = new Date(),
  ): Promise<DispatchOutcome> {
    const changeType = await this.dataSource
      .getRepository(FlightChangeType)
      .findOne({ where: { name: change.changeTypeName } });
    if (!changeType) {
      logger.warn(
        `Missing flight_change_types.${change.changeTypeName}; skipping`,
        null,
      );
      return { emailSent: false, inAppLogged: false, throttled: false };
    }

    const statusChange = await this.dataSource
      .getRepository(FlightStatusChange)
      .save({
        trackedFlightId: tracked.id,
        changeTypeId: changeType.id,
        oldValue: change.oldValue ? { value: change.oldValue } : null,
        newValue: change.newValue ? { value: change.newValue } : null,
        description: change.description,
        occurredAt: now,
        notificationSent: false,
      });

    const allowedByPrefs = isAllowedByPrefs(change.kind, prefs);
    if (!allowedByPrefs) {
      return { emailSent: false, inAppLogged: false, throttled: false };
    }

    const throttled =
      tracked.lastNotifiedAt !== null &&
      now.getTime() - tracked.lastNotifiedAt.getTime() < THROTTLE_MS;
    if (throttled) {
      return { emailSent: false, inAppLogged: false, throttled: true };
    }

    const ident = tracked.flight?.identIcao ?? tracked.flight?.callsign ?? "?";
    const link = `${this.appBaseUrlFactory()}/telemetry?flightId=${tracked.flightId}`;

    let emailSent = false;
    if (prefs.emailNotifications) {
      try {
        const payload: FlightNotificationPayload = {
          ident,
          changeKind: change.kind,
          oldValue: change.oldValue,
          newValue: change.newValue,
          flightLink: link,
        };
        await this.mailerFactory().sendFlightNotification(user.email, payload);
        emailSent = true;
      } catch (err) {
        logger.error("Failed to send flight notification email", err);
      }
    }

    await this.repo.insertNotification({
      userId: user.id,
      trackedFlightId: tracked.id,
      flightStatusChangeId: statusChange.id,
      type: change.kind,
      title: titleFor(change.kind, ident),
      body: change.description,
      link,
    });

    await this.dataSource
      .getRepository(FlightStatusChange)
      .update(statusChange.id, { notificationSent: emailSent });
    await this.repo.updateLastNotifiedAt(tracked.id, now);

    return { emailSent, inAppLogged: true, throttled: false };
  }
}

export function isAllowedByPrefs(
  kind: FlightChangeKind,
  prefs: UserPreferences,
): boolean {
  switch (kind) {
    case "delay":
      return prefs.notifyOnDelay;
    case "gate_change":
      return prefs.notifyOnGateChange;
    case "status_change":
    case "cancellation":
      return prefs.notifyOnStatusChange;
  }
}

function titleFor(kind: FlightChangeKind, ident: string): string {
  switch (kind) {
    case "delay":
      return `Lot ${ident} — opóźnienie`;
    case "gate_change":
      return `Lot ${ident} — zmiana bramki`;
    case "status_change":
      return `Lot ${ident} — zmiana statusu`;
    case "cancellation":
      return `Lot ${ident} — odwołany`;
  }
}
