import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { TaskCollection } from "@/components/fieldkit/product-collections";
import { getWorkspace } from "@/lib/product-queries";

export const metadata: Metadata = { title: "Tasks" };

async function TasksPage() {
  const { tasks } = await getWorkspace();
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

export default withAuthentication(TasksPage);
