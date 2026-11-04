"use client";
import { NOTES_CHANGED } from "@/lib/api/client";
import {
  loadLocalNotes,
  mergeLocalNotes,
} from "@/lib/products/product-sync/storage";
import type { NotesData } from "@/lib/products/types";
import { useItems } from "./use-items";
export function useNotes() {
  return useItems<NotesData>(
    "notes",
    NOTES_CHANGED,
    mergeLocalNotes,
    loadLocalNotes,
  );
}
