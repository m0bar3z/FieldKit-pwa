import { BookOpenIcon, PlusIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { DeleteDialog } from "@/components/fieldkit/delete-dialog";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import {
  NoteCollection,
  TaskCollection,
} from "@/components/fieldkit/product-collections";
import { ProjectDialog } from "@/components/fieldkit/project-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isProductId } from "@/lib/product-input";
import { getWorkspace } from "@/lib/product-queries";

async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  if (!isProductId(id)) notFound();
  const workspace = await getWorkspace();
  const project = workspace.projects.find((item) => item.id === id);
  if (!project) notFound();
  const tasks = workspace.tasks.filter((item) => item.projectId === id);
  const notes = workspace.notes.filter((item) => item.projectId === id);
  return (
    <>
      <PageHeading
        eyebrow="Project"
        title={project.name}
        description={project.description}
        back={{ href: "/projects", label: "All projects" }}
        actions={<ProjectDialog project={project} />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {project.total - project.completed} open tasks
          </Badge>
          <Badge variant="outline">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {project.updated}
          </span>
        </div>
        <DeleteDialog
          kind="project"
          title={project.name}
          id={id}
          version={project.version}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {project.completed} of {project.total} tasks complete ·{" "}
          {project.progress}%
        </p>
        <Progress
          value={project.progress}
          aria-label={`${project.name} task completion`}
        />
      </div>
      <Tabs defaultValue="tasks" className="gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="line" className="min-h-11">
            <TabsTrigger value="tasks" className="min-h-11 gap-2 px-4">
              Tasks<Badge variant="secondary">{tasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="notes" className="min-h-11 gap-2 px-4">
              Notes<Badge variant="secondary">{notes.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/notes/new?project=${id}`} variant="outline">
              <BookOpenIcon />
              New note
            </LinkButton>
            <LinkButton href={`/tasks/new?project=${id}`}>
              <PlusIcon />
              New task
            </LinkButton>
          </div>
        </div>
        <TabsContent value="tasks" className="flex flex-col gap-5">
          <TaskCollection
            tasks={tasks}
            projectId={id}
            projectName={project.name}
          />
        </TabsContent>
        <TabsContent value="notes" className="flex flex-col gap-5">
          <NoteCollection notes={notes} projectId={id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default withAuthentication(ProjectPage);
