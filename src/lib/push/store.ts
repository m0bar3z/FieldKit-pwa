import "server-only";

import { createHash } from "node:crypto";
import { ApiError } from "@/lib/api/errors";
import type { DeviceSubscription } from "./schemas";

export type PushSession = {
  userId: string;
  sessionId: string;
  expiresAt: number;
};
export type DeviceBinding = PushSession & {
  id: string;
  deviceHash: string;
  subscription: DeviceSubscription;
};
export type Delivery = {
  state: "pending" | "accepted" | "removed";
  attempts: number;
  nextAt: number;
};
export type ReminderJob = {
  taskId: string;
  reminderAt: number;
  revision: number;
  targets: Map<string, Delivery>;
};
type PushStore = {
  bindings: Map<string, DeviceBinding>;
  jobs: Map<string, ReminderJob>;
  running: boolean;
};
const pushGlobal = globalThis as typeof globalThis & {
  fieldkitPushStore?: PushStore;
};
pushGlobal.fieldkitPushStore ??= {
  bindings: new Map(),
  jobs: new Map(),
  running: false,
};
export const pushStore = pushGlobal.fieldkitPushStore;
const deviceHash = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");

export function deviceBinding(session: PushSession, secret: string) {
  const hash = deviceHash(secret);
  return [...pushStore.bindings.values()].find(
    (binding) =>
      binding.deviceHash === hash &&
      binding.userId === session.userId &&
      binding.sessionId === session.sessionId &&
      binding.expiresAt > Date.now(),
  );
}
export function registerDevice(
  session: PushSession,
  secret: string,
  subscription: DeviceSubscription,
) {
  const hash = deviceHash(secret);
  const existing = pushStore.bindings.get(subscription.endpoint);
  if (existing && existing.deviceHash !== hash)
    throw new ApiError(
      "This device registration changed. Disable notifications and try again.",
      409,
    );
  const expiresAt = Math.min(
    session.expiresAt,
    subscription.expirationTime ?? session.expiresAt,
  );
  if (expiresAt <= Date.now())
    throw new ApiError("This notification subscription expired.", 400);
  const devices = [...pushStore.bindings.values()];
  if (
    devices.filter(
      (b) =>
        b.userId === session.userId &&
        b.deviceHash !== hash &&
        b.expiresAt > Date.now(),
    ).length >= 20
  )
    throw new ApiError(
      "Disable reminders on an unused device before adding another.",
      400,
    );
  const unchanged =
    existing?.sessionId === session.sessionId &&
    existing.userId === session.userId &&
    existing.subscription.keys.auth === subscription.keys.auth &&
    existing.subscription.keys.p256dh === subscription.keys.p256dh;
  for (const binding of devices)
    if (binding.deviceHash === hash)
      pushStore.bindings.delete(binding.subscription.endpoint);
  const binding: DeviceBinding = {
    ...session,
    expiresAt,
    deviceHash: hash,
    subscription,
    id: unchanged ? existing.id : crypto.randomUUID(),
  };
  pushStore.bindings.set(subscription.endpoint, binding);
  return binding;
}
export function removeDevice(session: PushSession, secret: string) {
  const binding = deviceBinding(session, secret);
  if (binding) pushStore.bindings.delete(binding.subscription.endpoint);
}
export function removeSessionDevices(sessionId: string) {
  for (const [endpoint, binding] of pushStore.bindings)
    if (binding.sessionId === sessionId) pushStore.bindings.delete(endpoint);
}
