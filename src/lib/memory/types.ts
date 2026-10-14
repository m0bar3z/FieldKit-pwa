export type ItemMetadata = {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
export type DemoSession = { token: string; expiresAt: number };
