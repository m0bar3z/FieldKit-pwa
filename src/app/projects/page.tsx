import type { Metadata } from "next";
import { ProjectCard } from "@/components/fieldkit/content-cards";
import { EmptyItems } from "@/components/fieldkit/empty-items";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { ProjectDialog } from "@/components/fieldkit/project-dialog";
import { SearchControls } from "@/components/fieldkit/search-controls";
import { demoProjects } from "@/lib/demo-content";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  // TODO(data): Replace fixtures with the user's projects; handle loading and errors.
  return (
    <>
      <PageHeading
        eyebrow="Your workspace"
        title="Good things start with a plan."
        description="Keep related tasks and notes together. One project at a time."
        actions={<ProjectDialog />}
      />
      <SearchControls subject="projects" />
      <section
        aria-label="Projects"
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {demoProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </section>
      <EmptyItems
        kind="projects"
        title="Room for your next idea"
        description="A weekend away, a work project, or the everyday things. Give it a place to start."
      />
    </>
  );
}
