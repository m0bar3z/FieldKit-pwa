import { BookOpenIcon, PlusIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { NoteCard, TaskList } from "@/components/fieldkit/content-cards";
import { DeleteDialog } from "@/components/fieldkit/delete-dialog";
import { EmptyItems } from "@/components/fieldkit/empty-items";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { ProjectDialog } from "@/components/fieldkit/project-dialog";
import { SearchControls } from "@/components/fieldkit/search-controls";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoNotes, demoProjects, demoTasks } from "@/lib/demo-content";

export function generateStaticParams() {
  return demoProjects.map(({ id }) => ({ id }));
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  // Static fixture lookup only. TODO(data): Load this project and its related items.
  const project = demoProjects.find((item) => item.id === id);
  if (!project) notFound();
  const tasks = demoTasks.filter((item) => item.projectId === id);
  const notes = demoNotes.filter((item) => item.projectId === id);
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
        <DeleteDialog kind="project" title={project.name} />
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
            <LinkButton href="/notes/new" variant="outline">
              <BookOpenIcon />
              New note
            </LinkButton>
            <LinkButton href="/tasks/new">
              <PlusIcon />
              New task
            </LinkButton>
          </div>
        </div>
        <TabsContent value="tasks" className="flex flex-col gap-5">
          <SearchControls subject="tasks" filters />
          {tasks.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Small steps, steady progress.</CardTitle>
                <CardDescription>
                  Everything on the list for {project.name.toLowerCase()}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskList tasks={tasks} showProject={false} />
              </CardContent>
            </Card>
          ) : (
            <EmptyItems
              kind="tasks"
              title="Start with one small step"
              description="Add your first task and give this project a little direction."
              action={{ href: "/tasks/new", label: "Create a task" }}
            />
          )}
        </TabsContent>
        <TabsContent value="notes" className="flex flex-col gap-5">
          <SearchControls subject="notes" />
          {notes.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <EmptyItems
              kind="notes"
              title="An open page for your ideas"
              description="Capture something worth remembering. Your first note can be anything."
              action={{ href: "/notes/new", label: "Write a note" }}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
