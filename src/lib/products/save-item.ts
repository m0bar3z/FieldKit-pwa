import { saveNote } from "./product-sync/writes";
import type { Note } from "./types";
export const saveItem = (
  note: Note,
  input: { title: string; content: string },
) => saveNote(note.userId, input, note);
