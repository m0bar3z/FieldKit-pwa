import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/auth/types";
import { IndexedDbAction, SyncStatus } from "@/lib/indexed-db/enums";
import { initializeDB } from "@/lib/indexed-db/indexed-db";
import type { NoteRecord, TaskRecord } from "@/lib/memory/types";
import { withProductLock } from "./locks";
import { type Kind, type ProductAttempt, storeFor } from "./model";
import {
  acknowledge,
  failAttempt,
  hasPending,
  prepareAttempt,
  readChanges,
} from "./storage";

type OnChange = (kind: Kind) => void | Promise<void>;
export async function processProductQueue(
  force: boolean,
  onChange: OnChange,
  expectedUserId?: string,
  active: () => boolean = () => true,
) {
  await initializeDB();
  return withProductLock(async () => {
    if (!active() || !(await hasPending(expectedUserId))) return false;
    const { user } = await apiRequest<{ user: User }>("/api/auth/session", {
      signal: AbortSignal.timeout(15000),
    });
    if (expectedUserId && expectedUserId !== user.id)
      throw new ApiRequestError(
        { error: "Your account changed. Sign in again." },
        401,
      );
    let progressed = true;
    while (progressed && navigator.onLine && active()) {
      progressed = false;
      const records = (await readChanges(user.id)).sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      for (const record of records) {
        if (!navigator.onLine || !active()) break;
        const { kind, status, nextAttemptAt } = record.value;
        if (
          status !== SyncStatus.Pending ||
          (!force && nextAttemptAt > Date.now())
        )
          continue;
        const id = String(record.id);
        const attempt = await prepareAttempt(kind, id, user.id);
        if (!attempt) continue;
        try {
          let item: TaskRecord | NoteRecord | undefined = await reconcileLegacy(
            kind,
            attempt,
            user.id,
          );
          if (!item) {
            if (!active()) break;
            const create = attempt.action === IndexedDbAction.Create;
            const deleting = attempt.action === IndexedDbAction.Delete;
            const result = await apiRequest<{ item: TaskRecord | NoteRecord }>(
              create
                ? `/api/${storeFor(kind)}`
                : `/api/${storeFor(kind)}/${attempt.itemId}`,
              {
                method: create ? "POST" : deleting ? "DELETE" : "PATCH",
                headers: { "X-FieldKit-User": user.id },
                body: JSON.stringify({
                  ...(!deleting && attempt.payload),
                  mutationId: attempt.mutationId,
                  ...(!create && { version: String(attempt.version) }),
                }),
                signal: AbortSignal.timeout(15000),
              },
            );
            item = result.item;
          }
          await acknowledge(kind, id, user.id, attempt, item);
          progressed = true;
        } catch (error) {
          if (
            attempt.action === IndexedDbAction.Delete &&
            error instanceof ApiRequestError &&
            error.status === 404
          ) {
            await acknowledge(kind, id, user.id, attempt);
            progressed = true;
          } else await failAttempt(kind, id, user.id, attempt, error);
        }
        await onChange(kind);
      }
      force = false;
    }
    return hasPending(user.id);
  });
}

async function reconcileLegacy(
  kind: Kind,
  attempt: ProductAttempt,
  userId: string,
): Promise<NoteRecord | undefined> {
  if (!attempt.legacy || kind !== "note" || !("content" in attempt.payload))
    return undefined;
  const item = await apiRequest<NoteRecord>(`/api/notes/${attempt.itemId}`, {
    headers: { "X-FieldKit-User": userId },
    signal: AbortSignal.timeout(15000),
  });
  if (item.userId !== userId)
    throw new ApiRequestError(
      { error: "Your account changed. Sign in again." },
      401,
    );
  if (
    item.version === attempt.version + 1 &&
    item.title === attempt.payload.title &&
    item.content === attempt.payload.content
  )
    return item;
  if (item.version === attempt.version) return undefined;
  throw new ApiRequestError(
    { error: "This note changed. Review your saved local edit." },
    409,
  );
}
