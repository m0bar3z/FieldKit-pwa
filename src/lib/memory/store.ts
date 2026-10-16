import "server-only";

import type {
  AttachmentRecord,
  DemoSession,
  NoteRecord,
  TaskRecord,
} from "./types";

type MemoryStore = {
  tasks: TaskRecord[];
  notes: NoteRecord[];
  attachments: AttachmentRecord[];
  sessions: DemoSession[];
};
const demoGlobal = globalThis as typeof globalThis & {
  fieldkitDemoStore?: MemoryStore;
};
// Keep route modules and development reloads on the same process-local arrays.
// A restart or another server instance still gets an independent, empty store.
demoGlobal.fieldkitDemoStore ??= {
  tasks: [],
  notes: [],
  attachments: [],
  sessions: [],
};
export const memory = demoGlobal.fieldkitDemoStore;

// Preserve existing demo data across development reloads from ISO date storage.
function timestamp(value: number | string): number {
  return typeof value === "string" ? Date.parse(value) : value;
}
for (const item of [...memory.tasks, ...memory.notes, ...memory.attachments]) {
  item.createdAt = timestamp(item.createdAt);
  item.updatedAt = timestamp(item.updatedAt);
  if (item.deletedAt !== null) item.deletedAt = timestamp(item.deletedAt);
}
