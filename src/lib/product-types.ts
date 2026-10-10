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
  dueLabel: string;
  group: TaskGroup;
  reminderAt: string | null;
  reminderLabel: string;
  attachments: Attachment[];
};

export type Note = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  version: number;
  updated: string;
  attachments: Attachment[];
};
