import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { ProjectCollection } from "@/components/fieldkit/product-collections";
import { ProjectDialog } from "@/components/fieldkit/project-dialog";
import { getWorkspace } from "@/lib/product-queries";

export const metadata: Metadata = { title: "Projects" };

async function ProjectsPage() {
  const { projects } = await getWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="Your workspace"
        title="Good things start with a plan."
        description="Keep related tasks and notes together. One project at a time."
        actions={<ProjectDialog />}
      />
      <ProjectCollection projects={projects} />
    </>
  );
}

export default withAuthentication(ProjectsPage);
