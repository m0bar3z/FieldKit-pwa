"use client";

import { PlusIcon } from "lucide-react";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { TaskCollection } from "@/components/fieldkit/tasks/task-collection";
import { useTasks } from "@/hooks/use-tasks";
import { DataState } from "../feedback/data-state";

export function TasksPage() {
  const { data, error, retry } = useTasks();
  if (error || !data) return <DataState error={error} retry={retry} />;
  const tasks = data.items;
  return (
    <>
      <PageHeading
        eyebrow="Your notes and tasks"
        title="Tasks"
        description="Your next steps, all in one place."
        actions={
          <LinkButton href="/tasks/new">
            <PlusIcon data-icon="inline-start" />
            New task
          </LinkButton>
        }
      />
      {!!data.pendingDeletions && (
        <output className="text-sm text-muted-foreground">
          {data.pendingDeletions}{" "}
          {data.pendingDeletions === 1 ? "deletion saved" : "deletions saved"}{" "}
          on this device. Waiting to sync.
        </output>
      )}
      <TaskCollection tasks={tasks} timeZone={data.timeZone} />
    </>
  );
}
