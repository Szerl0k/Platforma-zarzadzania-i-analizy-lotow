import webpush from "web-push";
import { logger } from "../common/utils/logger";
import { TrackingRepository } from "./tracking.repository";

let configured = false;

/**
 * Lazily configures web-push with the VAPID keys from the environment.
 * Returns false when keys are not set, so push simply becomes a no-op in
 * environments without VAPID configured.
 */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export function isWebPushConfigured(): boolean {
  return ensureConfigured();
}

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to every browser the user has subscribed.
 * Dead subscriptions (HTTP 404/410 from the push service) are pruned.
 * Returns the number of successful deliveries.
 */
export async function sendPushToUser(
  repo: TrackingRepository,
  userId: string,
  payload: WebPushPayload,
): Promise<number> {
  if (!ensureConfigured()) return 0;

  const subscriptions = await repo.listPushSubscriptions(userId);
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        delivered += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired/unsubscribed — remove it.
          await repo.deletePushSubscriptionByEndpoint(sub.endpoint);
        } else {
          logger.error("Web push delivery failed", err);
        }
      }
    }),
  );

  return delivered;
}
