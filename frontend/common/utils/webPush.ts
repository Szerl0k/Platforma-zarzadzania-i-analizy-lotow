import {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
} from "@/common/api/tracking";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Registers the service worker, requests notification permission, subscribes via
 * the browser PushManager and persists the subscription on the backend.
 * Throws a user-readable error on any failure.
 */
export async function enableWebPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Twoja przeglądarka nie obsługuje powiadomień push.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Nie udzielono zgody na powiadomienia w przeglądarce.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { publicKey } = await getPushPublicKey();
  if (!publicKey) {
    throw new Error(
      "Web Push nie jest skonfigurowany na serwerze (brak VAPID).",
    );
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Nie udało się utworzyć subskrypcji push.");
  }

  await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

/**
 * Removes the browser subscription and tells the backend to forget it.
 * Best-effort: failures are swallowed so the UI toggle can always proceed.
 */
export async function disableWebPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await unsubscribePush(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}
