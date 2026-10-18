import { apiRequest } from "@/lib/api/client";
import type { NoteRecord } from "@/lib/memory/types";
import type { NoteEditAttempt } from "../note-edits";
import { notifyNoteChanges } from "./events";
import {
  acknowledgeNoteEdit,
  prepareNoteEditAttempt,
  recordNoteSyncFailure,
} from "./storage";

async function uploadNoteEdit(id: string, attempt: NoteEditAttempt) {
  const response = await apiRequest<{ item: NoteRecord }>(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...attempt.payload,
      version: String(attempt.version),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  return response.item;
}

export async function syncEdit(id: string) {
  const attempt = await prepareNoteEditAttempt(id);

  if (!attempt) return false;

  try {
    const item = await uploadNoteEdit(id, attempt);

    await acknowledgeNoteEdit(id, attempt, item);

    notifyNoteChanges();

    return true;
  } catch (error) {
    await recordNoteSyncFailure(id, attempt, error);

    notifyNoteChanges();

    return false;
  }
}
