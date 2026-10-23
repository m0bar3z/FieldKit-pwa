"use client";

import { NOTES_CHANGED } from "@/lib/api/client";
import { LEGACY_USER_ID } from "@/lib/auth/types";
import { IndexedDbAction } from "@/lib/indexed-db/enums";
import { getAllFromStore } from "@/lib/indexed-db/indexed-db";
import { applyNoteEdits } from "@/lib/products/note-edits";
import { readNoteEdits } from "@/lib/products/note-sync";
import type { ItemFormValues } from "@/lib/products/schemas";
import type { Note, NotesData } from "@/lib/products/types";
import { useItems } from "./use-items";

type LocalCreation = {
  userId?: string;
  kind: "task" | "note";
  action: IndexedDbAction;
  payload: ItemFormValues;
};

async function mergeLocalNotes(data: NotesData): Promise<NotesData> {
  const records = await getAllFromStore<LocalCreation>("notes");
  const local = records.flatMap<Note>(({ id, createdAt, value }) => {
    if (
      value.action !== IndexedDbAction.Create ||
      value.kind !== "note" ||
      value.payload.kind !== "note" ||
      (value.userId ?? LEGACY_USER_ID) !== data.userId
    )
      return [];
    return [
      {
        id: String(id),
        userId: data.userId,
        localId: Number(id),
        title: value.payload.title,
        content: value.payload.content,
        excerpt: value.payload.content.slice(0, 240),
        version: 0,
        updated: createdAt,
        attachments: [],
      },
    ];
  });
  return {
    ...data,
    items: applyNoteEdits(
      [...data.items, ...local],
      await readNoteEdits(data.userId),
    ),
  };
}

export function useNotes() {
  return useItems<NotesData>("notes", NOTES_CHANGED, mergeLocalNotes);
}
