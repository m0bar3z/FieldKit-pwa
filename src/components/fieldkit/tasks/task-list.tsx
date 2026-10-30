import {
  ArrowRightIcon,
  BellIcon,
  CalendarDaysIcon,
  PaperclipIcon,
} from "lucide-react";
import { AppLink as Link } from "@/components/fieldkit/navigation/app-link";
import { Separator } from "@/components/ui/separator";
import { formatDueDate, formatReminder } from "@/lib/products/presentation";
import type { Task } from "@/lib/products/types";
import { cn } from "@/lib/shared/utils";
import { DeleteDialog } from "../editors/delete-dialog";
import { EditItemDialog } from "../editors/edit-item-dialog";
import { TaskCompletion } from "./task-completion";
import { TaskSyncStatus } from "./task-sync-status";
import { TaskUpdated } from "./task-updated";

export function TaskList({
  tasks,
  timeZone,
}: {
  tasks: Task[];
  timeZone: string;
}) {
  return (
    <div className="flex flex-col">
      {tasks.map((task, index) => {
        return (
          <div key={task.id}>
            <div className="flex items-start gap-3 py-4 sm:gap-4">
              <div className="shrink-0 px-1">
                <TaskCompletion task={task} />
              </div>
              <Link
                href={`/tasks/${task.id}`}
                className="group flex min-w-0 flex-1 flex-col gap-2 py-2"
              >
                <span
                  className={cn(
                    "text-sm font-medium leading-relaxed group-hover:underline underline-offset-4",
                    task.completed && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      task.group === "overdue" && "text-destructive",
                    )}
                  >
                    <CalendarDaysIcon className="size-3.5" />
                    {formatDueDate(task.dueDate)}
                  </span>
                  {task.reminderAt !== null && (
                    <span className="inline-flex items-center gap-1">
                      <BellIcon className="size-3.5" />
                      {formatReminder(task.reminderAt, timeZone)}
                    </span>
                  )}
                  {task.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <PaperclipIcon className="size-3.5" />
                      {task.attachments.length}
                      <span className="sr-only">attachments</span>
                    </span>
                  )}
                </span>
                <TaskUpdated timestamp={task.updated} timeZone={timeZone} />
              </Link>
              {!task.deletionPending && (
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row">
                  <EditItemDialog task={task} />
                  <DeleteDialog
                    kind="task"
                    task={task}
                    title={task.title}
                    id={task.id}
                    version={task.version}
                    redirect={false}
                  />
                </div>
              )}
              <ArrowRightIcon className="mt-5 hidden size-4 shrink-0 text-muted-foreground sm:block" />
            </div>
            {task.syncStatus && (
              <div className="pb-4">
                <TaskSyncStatus task={task} />
              </div>
            )}
            {index < tasks.length - 1 && <Separator />}
          </div>
        );
      })}
    </div>
  );
}
