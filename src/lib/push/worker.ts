import {
  type ReminderPayload,
  reminderPayloadSchema,
  reminderTag,
} from "./payload";

const ACCOUNT_CACHE = "fieldkit-push-session";
const accountUrl = (scope: ServiceWorkerGlobalScope) =>
  new URL("/__fieldkit_push_account__", scope.location.origin).href;
async function knownAccount(
  scope: ServiceWorkerGlobalScope,
): Promise<string | null | undefined> {
  const response = await (await scope.caches.open(ACCOUNT_CACHE)).match(
    accountUrl(scope),
  );
  return response ? (await response.json()).userId : undefined;
}
export async function recordPushAccount(
  scope: ServiceWorkerGlobalScope,
  userId: string | null,
) {
  await (await scope.caches.open(ACCOUNT_CACHE)).put(
    accountUrl(scope),
    Response.json({ userId }),
  );
}
export async function displayTaskReminder(
  scope: ServiceWorkerGlobalScope,
  input: unknown,
) {
  const parsed = reminderPayloadSchema.safeParse(input);
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) return;
  const payload = parsed.data;
  const account = await knownAccount(scope).catch(() => undefined);
  if (account === null || (account !== undefined && account !== payload.userId))
    return;
  let body = "You have a task reminder. Open FieldKit to view it.";
  try {
    const session = await scope.fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(5000),
    });
    if (session.status === 401) return;
    if (!session.ok) throw new Error("Session unavailable");
    const { user } = await session.json();
    if (user?.id !== payload.userId) return;
    const taskResponse = await scope.fetch(`/api/tasks/${payload.taskId}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "X-FieldKit-User": payload.userId },
      signal: AbortSignal.timeout(5000),
    });
    if ([401, 404].includes(taskResponse.status)) return;
    if (taskResponse.ok) {
      const task = await taskResponse.json();
      if (
        task.userId !== payload.userId ||
        task.completed ||
        task.deletedAt ||
        task.reminderAt !== payload.reminderAt
      )
        return;
      if (typeof task.title === "string") body = task.title.slice(0, 200);
    }
  } catch {
    /* Offline or unavailable: show generic text, never cached private task content. */
  }
  // A sign-out can finish during the above requests.
  const latest = await knownAccount(scope).catch(() => undefined);
  if (
    latest === null ||
    (latest !== undefined && latest !== payload.userId) ||
    payload.expiresAt <= Date.now()
  )
    return;
  await scope.registration.showNotification("FieldKit task reminder", {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: reminderTag(payload),
    data: payload,
  });
}
export function reminderDestination(payload: ReminderPayload) {
  return `/reminders/open?taskId=${encodeURIComponent(payload.taskId)}&userId=${encodeURIComponent(payload.userId)}`;
}
export async function openTaskReminder(
  scope: ServiceWorkerGlobalScope,
  input: unknown,
) {
  const parsed = reminderPayloadSchema.safeParse(input);
  if (!parsed.success) return;
  const destination = new URL(
    reminderDestination(parsed.data),
    scope.location.origin,
  ).href;
  const clients = await scope.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const existing = clients.find(
    (client) => new URL(client.url).origin === scope.location.origin,
  );
  if (existing) {
    const navigated = await existing.navigate(destination).catch(() => null);
    if (navigated) {
      await navigated.focus();
      return;
    }
  }
  await scope.clients.openWindow(destination);
}
