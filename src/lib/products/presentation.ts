import type { Task, TaskFilter, TaskGroup } from "./types";

export const TIME_ZONE_COOKIE = "fieldkit-time-zone";

export function normalizeTimeZone(value?: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value ? decodeURIComponent(value) : "UTC",
    }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// A due date is a calendar day. Never convert it to a user's midnight instant.
export function calendarDateAt(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatDueDate(value: string): string {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00Z`))
    : "No due date";
}

export function formatNoteUpdated(timestamp: number, timeZone: string): string {
  return `Updated ${formatDueDate(calendarDateAt(new Date(timestamp), timeZone))}`;
}

export function formatReminder(
  timestamp: number | null,
  timeZone: string,
): string {
  if (timestamp === null) return "No reminder set";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}

export function taskGroup(
  task: Pick<Task, "completed" | "dueDate">,
  today: string,
): TaskGroup {
  if (task.completed) return "completed";
  if (!task.dueDate) return "unscheduled";
  if (task.dueDate < today) return "overdue";
  return task.dueDate === today ? "today" : "upcoming";
}

export function matchesSearch(query: string, ...values: string[]): boolean {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter(Boolean);
  const text = values.join(" ").toLocaleLowerCase("en-US");
  return terms.every((term) => text.includes(term));
}

export function filterTasks(
  tasks: Task[],
  query: string,
  status: TaskFilter,
): Task[] {
  return tasks.filter(
    (task) =>
      matchesSearch(query, task.title, task.description) &&
      (status === "all" ||
        (status === "open" ? !task.completed : task.group === status)),
  );
}
