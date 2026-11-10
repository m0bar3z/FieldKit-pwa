import { apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/auth/types";

export type PushStatus = {
  configured: boolean;
  publicKey: string;
  subscribed: boolean;
  endpoint: string | null;
  userId: string;
};
const DEVICE_KEY = "fieldkit-push-device";
const ACCOUNT_KEY = "fieldkit-push-account";
export function pushSupported() {
  return (
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
async function withDeviceLock<T>(work: () => Promise<T>): Promise<T> {
  return navigator.locks
    ? navigator.locks.request("fieldkit-push-device", work)
    : work();
}
function secret() {
  let value = localStorage.getItem(DEVICE_KEY);
  if (!value) {
    value = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem(DEVICE_KEY, value);
  }
  return value;
}
function headers(userId: string) {
  return { "X-FieldKit-User": userId, "X-FieldKit-Device": secret() };
}
async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing?.active) return existing;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "The app is still preparing notifications. Reload and try again.",
              ),
            ),
          10000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
function publicKeyBytes(value: string) {
  return Uint8Array.from(
    atob(
      value.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (value.length % 4)) % 4),
    ),
    (char) => char.charCodeAt(0),
  );
}
export function announcePushAccount(userId: string | null) {
  try {
    localStorage.setItem(ACCOUNT_KEY, userId ?? "");
    navigator.serviceWorker?.controller?.postMessage({
      type: "fieldkit-push-account",
      userId,
    });
  } catch {
    /* Storage may be unavailable; the worker still checks the server. */
  }
}
export function inspectTaskPush(expectedUserId?: string): Promise<PushStatus> {
  return withDeviceLock(async () => {
    const { user } = await apiRequest<{ user: User }>("/api/auth/session", {
      signal: AbortSignal.timeout(15000),
    });
    if (expectedUserId && user.id !== expectedUserId)
      throw new Error("Your account changed. Reload to manage reminders.");
    announcePushAccount(user.id);
    const status = await apiRequest<Omit<PushStatus, "userId">>(
      "/api/push/subscription",
      { headers: headers(user.id), signal: AbortSignal.timeout(15000) },
    );
    const sub = await (await registration()).pushManager.getSubscription();
    const valid =
      Notification.permission === "granted" &&
      !!sub &&
      sub.endpoint === status.endpoint;
    if (status.subscribed && !valid) {
      await apiRequest("/api/push/subscription", {
        method: "DELETE",
        headers: headers(user.id),
        signal: AbortSignal.timeout(15000),
      });
    }
    return {
      ...status,
      userId: user.id,
      subscribed: status.subscribed && valid,
    };
  });
}
export async function reconcileTaskPush(userId: string) {
  try {
    if (pushSupported() && localStorage.getItem(DEVICE_KEY))
      await inspectTaskPush(userId);
  } catch {
    /* Retry when the user opens the controls or returns online. */
  }
}
export async function enableTaskPush(userId: string, publicKey: string) {
  // Call before any await: Safari requires permission to follow the button gesture.
  const permission = Notification.requestPermission();
  if ((await permission) !== "granted")
    throw new Error(
      "Allow notifications in your browser settings to enable task reminders.",
    );
  return withDeviceLock(async () => {
    const worker = await registration();
    let sub = await worker.pushManager.getSubscription();
    if (sub?.options.applicationServerKey) {
      const actual = new Uint8Array(sub.options.applicationServerKey);
      const expected = publicKeyBytes(publicKey);
      if (
        actual.length !== expected.length ||
        actual.some((byte, i) => byte !== expected[i])
      ) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    sub ??= await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKeyBytes(publicKey),
    });
    await apiRequest("/api/push/subscription", {
      method: "POST",
      headers: headers(userId),
      body: JSON.stringify({
        deviceSecret: secret(),
        subscription: sub.toJSON(),
      }),
      signal: AbortSignal.timeout(15000),
    });
    announcePushAccount(userId);
  });
}
export function disableTaskPush(userId: string) {
  return withDeviceLock(async () => {
    // Remove server delivery first; a failed browser unsubscribe can then be retried safely.
    await apiRequest("/api/push/subscription", {
      method: "DELETE",
      headers: headers(userId),
      signal: AbortSignal.timeout(15000),
    });
    const worker = await registration();
    const sub = await worker.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    for (const notification of await worker.getNotifications())
      if (notification.tag.startsWith("fieldkit-task:")) notification.close();
  });
}
export async function clearTaskPushOnSessionChange() {
  announcePushAccount(null);
  if (!("serviceWorker" in navigator)) return;
  try {
    await withDeviceLock(async () => {
      const worker = await navigator.serviceWorker.getRegistration("/");
      const sub = await worker?.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      for (const notification of (await worker?.getNotifications()) ?? [])
        if (notification.tag.startsWith("fieldkit-task:")) notification.close();
    });
  } catch {
    /* Server session bindings have already been removed. */
  }
}
