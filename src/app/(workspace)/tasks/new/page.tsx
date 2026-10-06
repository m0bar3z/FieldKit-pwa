import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NewItemEditor } from "@/components/fieldkit/editors";
import { PageHeading } from "@/components/fieldkit/page-heading";

import { getWorkspace } from "@/lib/product-queries";

export const metadata: Metadata = { title: "New task" };

async function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  const workspace = await getWorkspace();
  const query = await searchParams;
  const projectId =
    typeof query.project === "string" &&
    workspace.projects.some((project) => project.id === query.project)
      ? query.project
      : undefined;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <PageHeading
        eyebrow="A fresh start"
        title="What’s your next step?"
        description="Turn a little intention into something you can come back to."
        back={{ href: "/projects", label: "Back to projects" }}
      />
      <NewItemEditor
        kind="task"
        projects={workspace.projects}
        projectId={projectId}
      />
    </div>
  );
}

export default withAuthentication(NewTaskPage);
