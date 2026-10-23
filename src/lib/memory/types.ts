export type ItemMetadata = {
  id: string;
  userId: string;
  version: number;
  /** Unix timestamps in milliseconds. */
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};
export type TaskRecord = ItemMetadata & {
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
};
export type NoteRecord = ItemMetadata & { title: string; content: string };
export type AttachmentRecord = ItemMetadata & {
  kind: "task" | "note";
  parentId: string;
  name: string;
  mimeType: string;
  bytes: Uint8Array;
};
