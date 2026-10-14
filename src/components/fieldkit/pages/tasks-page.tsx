"use client";

import { PlusIcon } from "lucide-react";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { TaskCollection } from "@/components/fieldkit/tasks/task-collection";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceDataState } from "../feedback/workspace-data-state";

export function TasksPage() {
  const { workspace, error, retry } = useWorkspace();
  if (error || !workspace)
    return <WorkspaceDataState error={error} retry={retry} />;
  const { tasks } = workspace;
  return (
    <>
      <PageHeading
        eyebrow="Your personal workspace"
        title="Tasks"
        description="Your next steps, all in one place."
        actions={
          <LinkButton href="/tasks/new">
            <PlusIcon data-icon="inline-start" />
            New task
          </LinkButton>
        }
      />
      <TaskCollection tasks={tasks} />
    </>
  );
}
