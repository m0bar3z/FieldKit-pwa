import { LEGACY_USER_ID } from "@/lib/auth/types";
import {
  discardProduct,
  notifyProductChanges,
  retryProduct,
  startProductSync,
  syncProducts,
} from "../product-sync/runtime";
import { readChanges } from "../product-sync/storage";
export const startNoteSync = (userId = LEGACY_USER_ID) =>
  startProductSync(userId);
export const syncPendingChanges = (force = false) =>
  syncProducts(force, LEGACY_USER_ID);
export const notifyNoteChanges = () => notifyProductChanges("note");
export const readNoteEdits = (userId?: string) => readChanges(userId, "note");
export const retryNoteEdit = (id: string, userId = LEGACY_USER_ID) =>
  retryProduct("note", id, userId);
export const discardNoteEdit = (id: string, userId = LEGACY_USER_ID) =>
  discardProduct("note", id, userId);
