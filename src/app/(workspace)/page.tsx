import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  Clock3Icon,
  PlusIcon,
} from "lucide-react";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NoteCard } from "@/components/fieldkit/content-cards";
import { EmptyItems } from "@/components/fieldkit/empty-items";
import { LinkButton } from "@/components/fieldkit/link-button";
import { OnlineIndicator } from "@/components/fieldkit/online-indicator";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { TaskCollection } from "@/components/fieldkit/product-collections";
import { WorkspaceLink as Link } from "@/components/fieldkit/workspace-link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWorkspace } from "@/lib/product-queries";

async function Home() {
  const workspace = await getWorkspace();
  return (
    <>
      <PageHeading
        eyebrow={`Your workspace · ${workspace.timeZone}`}
        status={<OnlineIndicator />}
        title="A little focus for today."
        description="Your tasks, notes, and plans. A little easier to keep together."
        actions={
          <>
            <LinkButton href="/notes/new" variant="outline">
              <BookOpenIcon />
              New note
            </LinkButton>
            <LinkButton href="/tasks/new">
              <PlusIcon />
              New task
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Due today",
            count: workspace.counts.dueToday,
            caption: "Open tasks due on your local date",
            icon: CalendarDaysIcon,
          },
          {
            label: "Overdue",
            count: workspace.counts.overdue,
            caption: "Pick it up when you're ready",
            icon: Clock3Icon,
          },
          {
            label: "Active projects",
            count: workspace.counts.activeProjects,
            caption: "Everything has a place",
            icon: BookOpenIcon,
          },
        ].map(({ label, count, caption, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardAction>
                <Icon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {count}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section
          aria-label="Your task list"
          className="flex min-w-0 flex-col gap-5"
        >
          <TaskCollection tasks={workspace.tasks} />
        </section>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your projects</CardTitle>
              <CardDescription>
                A home for each part of your day.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!workspace.projects.length && (
                <EmptyItems
                  kind="projects"
                  title="Your first project"
                  description="Create a home for your tasks and notes."
                  action={{ href: "/projects", label: "Create a project" }}
                />
              )}
              {workspace.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.total - project.completed} open tasks
                    </span>
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
            <CardFooter>
              <Link
                href="/projects"
                className="flex min-h-11 items-center gap-2 text-sm font-medium"
              >
                All projects
                <ArrowRightIcon className="size-4" />
              </Link>
            </CardFooter>
          </Card>
          <section
            aria-labelledby="recent-notes-heading"
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h2 id="recent-notes-heading" className="text-sm font-semibold">
                Worth remembering
              </h2>
              <BookOpenIcon className="size-4 text-muted-foreground" />
            </div>
            {!workspace.notes.length && (
              <EmptyItems
                kind="notes"
                title="An open page for your ideas"
                description="Create a project, then add your first note."
              />
            )}
            {workspace.notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </section>
        </div>
      </div>
      {/* TODO(PWA): Connect reminder delivery, offline state, and synchronization in later phases. */}
    </>
  );
}

export default withAuthentication(Home);
