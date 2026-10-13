import type { TaskGroup } from "./types";

export const taskSections: {
  group: TaskGroup;
  title: string;
  caption: string;
}[] = [
  { group: "overdue", title: "Needs a little attention", caption: "Overdue" },
  { group: "today", title: "On your list today", caption: "Today" },
  { group: "upcoming", title: "A little further ahead", caption: "Upcoming" },
  { group: "unscheduled", title: "When you're ready", caption: "No due date" },
  { group: "completed", title: "Steps you've taken", caption: "Completed" },
];
