"use client";

import { type ReactNode, useState } from "react";
import { AppLink } from "@/components/fieldkit/navigation/app-link";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDueDate } from "@/lib/products/presentation";
import type { Task } from "@/lib/products/types";
import { TaskDescription } from "./task-description";
import { TaskSyncStatus } from "./task-sync-status";
import { TaskUpdated } from "./task-updated";

const triggerClassName =
  "group flex min-w-0 flex-1 flex-col gap-2 py-2 text-left";

export function TaskPreviewLink({
  task,
  timeZone,
  children,
}: {
  task: Task;
  timeZone: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Keep an open preview mounted if reconnection assigns the task its server ID.
  if (!task.localOnly && !open)
    return (
      <AppLink href={`/tasks/${task.id}`} className={triggerClassName}>
        {children}
      </AppLink>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={triggerClassName}
        aria-label={`Preview ${task.title}`}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="min-w-0">
          <DialogTitle className="break-words">{task.title}</DialogTitle>
          <DialogDescription>
            {task.localOnly
              ? "Saved on this device. This task hasn’t been synced yet."
              : "Your task details."}
          </DialogDescription>
        </DialogHeader>
        <TaskSyncStatus task={task} />
        <TaskUpdated timestamp={task.updated} timeZone={timeZone} />
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={task.completed ? "secondary" : "outline"}>
            {task.completed ? "Completed" : "Open task"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDueDate(task.dueDate)}
          </span>
        </div>
        <TaskDescription description={task.description} />
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
