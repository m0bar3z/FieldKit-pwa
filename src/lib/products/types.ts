import type { NoteSyncStatus } from "@/lib/indexed-db/enums";

export type Attachment = {
  id: string;
  version: number;
  name: string;
  size: string;
  kind: "image" | "file";
};
export type TaskGroup =
  | "overdue"
  | "today"
  | "upcoming"
  | "unscheduled"
  | "completed";
export type TaskFilter = "all" | "open" | TaskGroup;

export type Task = {
  id: string;
  title: string;
  description: string;
  version: number;
  completed: boolean;
  dueDate: string;
  group: TaskGroup;
  /** Unix timestamp in milliseconds, or null when no reminder is set. */
  reminderAt: number | null;
  attachments: Attachment[];
};

export type Note = {
  id: string;
  userId: string;
  /** IndexedDB identity for a note that has not been saved to the server. */
  localId?: number;
  syncStatus?: NoteSyncStatus;
  syncError?: string;
  title: string;
  content: string;
  excerpt: string;
  version: number;
  /** Unix timestamp in milliseconds. */
  updated: number;
  attachments: Attachment[];
};

export type TasksData = {
  userId: string;
  items: Task[];
  today: string;
  timeZone: string;
  counts: {
    dueToday: number;
    overdue: number;
    completedTasks: number;
    openTasks: number;
  };
};

export type NotesData = {
  userId: string;
  items: Note[];
  timeZone: string;
};
