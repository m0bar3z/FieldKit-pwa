"use client";

import { BellIcon, CalendarDaysIcon } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Attachments } from "@/components/fieldkit/attachments/attachments";
import { DeleteDialog } from "@/components/fieldkit/editors/delete-dialog";
import { EditItemDialog } from "@/components/fieldkit/editors/edit-item-dialog";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { TaskCompletion } from "@/components/fieldkit/tasks/task-completion";
import { TaskDescription } from "@/components/fieldkit/tasks/task-description";
import { TaskSyncStatus } from "@/components/fieldkit/tasks/task-sync-status";
import { TaskUpdated } from "@/components/fieldkit/tasks/task-updated";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTasks } from "@/hooks/use-tasks";
import { formatDueDate, formatReminder } from "@/lib/products/presentation";
import { DataState } from "../feedback/data-state";
import { LinkButton } from "../navigation/link-button";

export function TaskDetailPage({ id }: { id: string }) {
  const { data, error, retry } = useTasks();
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);
  const task = data?.items.find(
    (item) => item.id === id || item.localId === id,
  );
  useEffect(() => {
    if (task && task.id !== id) router.replace(`/tasks/${task.id}`);
  }, [task, id, router]);
  if (deleted)
    return (
      <div className="flex flex-col items-start gap-4">
        <output>Task deleted on this device.</output>
        <LinkButton href="/tasks">Back to tasks</LinkButton>
      </div>
    );
  if (error || !data) return <DataState error={error} retry={retry} />;
  if (!task) notFound();
  return (
    <>
      <TaskSyncStatus task={task} />
      <PageHeading
        eyebrow="Task"
        title={task.title}
        description="A clear next step, with the details close at hand."
        back={{ href: "/tasks", label: "All tasks" }}
        actions={!task.deletionPending && <EditItemDialog task={task} />}
      />
      <TaskUpdated timestamp={task.updated} timeZone={data.timeZone} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>The details</CardTitle>
              <CardDescription>
                A little context for when you’re ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <TaskDescription description={task.description} />
              <Separator />
              <TaskCompletion task={task} label />
            </CardContent>
          </Card>
          {task.localOnly ? (
            <p className="text-sm text-muted-foreground">
              Sync this task before adding attachments.
            </p>
          ) : (
            <Attachments
              items={task.attachments}
              kind="task"
              parentId={task.id}
            />
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
            <CardDescription>Status, due date, and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Badge
              variant={
                task.completed
                  ? "secondary"
                  : task.group === "overdue"
                    ? "destructive"
                    : "outline"
              }
            >
              {task.completed
                ? "Completed"
                : task.group === "overdue"
                  ? "Overdue"
                  : "Open task"}
            </Badge>
            <div className="flex items-start gap-3">
              <CalendarDaysIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due date</p>
                <p className="mt-1 text-sm">{formatDueDate(task.dueDate)}</p>
              </div>
            </div>
            {/* TODO(product): Allow reminders to be set, edited, and removed. */}
            {/* TODO(PWA): Deliver reminders using push notifications later. */}
            <div className="flex items-start gap-3">
              <BellIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reminder</p>
                <p className="mt-1 text-sm">
                  {formatReminder(task.reminderAt, data.timeZone)}
                </p>
              </div>
            </div>
            <Separator />
            {!task.deletionPending && (
              <DeleteDialog
                kind="task"
                task={task}
                onDeleted={() => setDeleted(true)}
                title={task.title}
                id={task.id}
                version={task.version}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
