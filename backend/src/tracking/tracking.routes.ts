import { Router, Request, Response, NextFunction } from "express";
import { TrackingService } from "./tracking.service";
import { TrackingRepository } from "./tracking.repository";
import {
  ConfirmTrackSchema,
  HistoryQuerySchema,
  MarkFlownSchema,
  NotificationListQuerySchema,
  PreviewFlightSchema,
  PushSubscribeSchema,
  PushUnsubscribeSchema,
  NotificationDTO,
} from "./tracking.dto";
import { getVapidPublicKey } from "./web-push.service";

const router = Router();
const service = new TrackingService();
const repo = new TrackingRepository();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function userId(req: Request): string {
  return req.userId ?? "";
}

// ---------- Tracking ----------

router.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const body = PreviewFlightSchema.parse(req.body);
    const result = await service.previewByIdent(body.ident, body.date);
    res.json(result);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = ConfirmTrackSchema.parse(req.body);
    const result = await service.confirmTrack(
      userId(req),
      body.flightId,
      body.source,
    );
    res.status(201).json(result);
  }),
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const result = await service.listMyFlights(userId(req));
    res.json(result);
  }),
);

router.get(
  "/me/count",
  asyncHandler(async (req, res) => {
    const count = await service.countActive(userId(req));
    res.json({ count });
  }),
);

// History — must come before "/:id" to avoid matching it.
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const query = HistoryQuerySchema.parse(req.query);
    const result = await service.listHistory(userId(req), query);
    res.json(result);
  }),
);

router.get(
  "/history/export",
  asyncHandler(async (req, res) => {
    const csv = await service.exportHistoryCsv(userId(req));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="historia-lotow.csv"`,
    );
    res.send(csv);
  }),
);

// Route of a specific historical flight (GeoJSON) — for "show route on map".
router.get(
  "/history/:id/route",
  asyncHandler(async (req, res) => {
    const result = await service.getHistoryRoute(
      userId(req),
      req.params.id as string,
    );
    res.json(result);
  }),
);

// Mark / unmark a historical flight as actually flown by the user.
router.patch(
  "/history/:id",
  asyncHandler(async (req, res) => {
    const body = MarkFlownSchema.parse(req.body);
    const result = await service.markFlown(
      userId(req),
      req.params.id as string,
      body.flown,
    );
    res.json(result);
  }),
);

router.delete(
  "/history/:id",
  asyncHandler(async (req, res) => {
    await service.deleteHistory(userId(req), req.params.id as string);
    res.status(204).send();
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await service.untrack(userId(req), req.params.id as string);
    res.status(204).send();
  }),
);

export default router;

// ---------- Notifications router (separate mount) ----------

export const notificationsRouter = Router();

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = NotificationListQuerySchema.parse(req.query);
    const items = await repo.listNotifications(userId(req), {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
    });
    const dtos: NotificationDTO[] = items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      trackedFlightId: n.trackedFlightId,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    }));
    res.json(dtos);
  }),
);

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await repo.countUnread(userId(req));
    res.json({ count });
  }),
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const ok = await repo.markNotificationRead(
      userId(req),
      req.params.id as string,
    );
    res.status(ok ? 204 : 404).send();
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const updated = await repo.markAllNotificationsRead(userId(req));
    res.json({ updated });
  }),
);

// ---------- Web Push ----------

notificationsRouter.get(
  "/push/public-key",
  asyncHandler(async (_req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  }),
);

notificationsRouter.post(
  "/push/subscribe",
  asyncHandler(async (req, res) => {
    const body = PushSubscribeSchema.parse(req.body);
    await repo.upsertPushSubscription({
      userId: userId(req),
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
    res.status(201).json({ ok: true });
  }),
);

notificationsRouter.delete(
  "/push/unsubscribe",
  asyncHandler(async (req, res) => {
    const body = PushUnsubscribeSchema.parse(req.body);
    await repo.deletePushSubscription(userId(req), body.endpoint);
    res.status(204).send();
  }),
);
