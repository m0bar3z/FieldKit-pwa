import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCheckIcon,
  Clock3Icon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NoteCard, TaskList } from "@/components/fieldkit/content-cards";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { demoNotes, demoProjects, demoTasks } from "@/lib/demo-content";

const taskSections = [
  {
    group: "overdue",
    label: "Needs a little attention",
    caption: "Overdue",
    icon: Clock3Icon,
  },
  {
    group: "today",
    label: "On your list today",
    caption: "Today",
    icon: CalendarDaysIcon,
  },
  {
    group: "upcoming",
    label: "A little further ahead",
    caption: "Upcoming",
    icon: CheckCheckIcon,
  },
] as const;

async function Home() {
  return (
    <>
      <PageHeading
        eyebrow="Friday, October 2, 2026"
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
      {/* TODO(product): Calculate summaries and day groups using actual tasks and the user's local date. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Due today",
            count: "02",
            caption: "A couple of clear next steps",
            icon: CalendarDaysIcon,
          },
          {
            label: "Overdue",
            count: "01",
            caption: "Pick it up when you're ready",
            icon: Clock3Icon,
          },
          {
            label: "Active projects",
            count: "03",
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
          {taskSections.map(({ group, label, caption, icon: Icon }) => {
            const tasks = demoTasks.filter((task) => task.group === group);
            return (
              <Card key={group}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </CardTitle>
                  <CardDescription>{caption}</CardDescription>
                  <CardAction>
                    <Badge
                      variant={
                        group === "overdue" ? "destructive" : "secondary"
                      }
                    >
                      {tasks.length}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <TaskList tasks={tasks} />
                </CardContent>
              </Card>
            );
          })}
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
              {demoProjects.map((project) => (
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
            {demoNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </section>
        </div>
      </div>
      {/* TODO(PWA): Connect reminders, offline state, and synchronization in later phases. */}
    </>
  );
}

export default withAuthentication(Home);
