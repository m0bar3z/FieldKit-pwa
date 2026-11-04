import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import { overlayNotes } from "./product-sync/adapters";
import type { Change } from "./product-sync/model";
import type { Note } from "./types";
export function applyNoteEdits(notes: Note[], edits: StoredRecord<Change>[]) {
  const userId = notes[0]?.userId ?? edits[0]?.value.userId ?? "";
  return overlayNotes({ userId, items: notes, timeZone: "UTC" }, edits).items;
}
