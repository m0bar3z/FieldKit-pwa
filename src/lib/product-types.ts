export type Project = {
  id: string;
  name: string;
  description: string;
  category: "travel" | "work" | "personal";
  version: number;
  completed: number;
  total: number;
  noteCount: number;
  progress: number;
  updated: string;
};

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
  projectId: string;
  projectName: string;
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
  projectId: string;
  projectName: string;
  version: number;
  updated: string;
  attachments: Attachment[];
};
