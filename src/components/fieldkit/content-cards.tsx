import {
  ArrowRightIcon,
  BellIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  LeafIcon,
  PaperclipIcon,
  PlaneIcon,
} from "lucide-react";
import Link from "next/link";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  type DemoNote,
  type DemoProject,
  type DemoTask,
  demoNotes,
  demoProjects,
} from "@/lib/demo-content";
import { cn } from "@/lib/utils";

const projectIcons = {
  travel: PlaneIcon,
  work: BriefcaseBusinessIcon,
  personal: LeafIcon,
};

export function ProjectCard({ project }: { project: DemoProject }) {
  const Icon = projectIcons[project.category];
  // Fixture-only presentation. These counters must not be treated as live product statistics.
  const noteCount = demoNotes.filter(
    (note) => note.projectId === project.id,
  ).length;
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
        <CardTitle>
          <Link
            href={`/projects/${project.id}`}
            className="hover:underline underline-offset-4"
          >
            {project.name}
          </Link>
        </CardTitle>
        <CardDescription className="min-h-12">
          {project.description}
        </CardDescription>
        <CardAction>
          <Badge variant="outline">
            {project.total ? "In progress" : "New"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* TODO(product): Derive task completion and note counts from actual project data. */}
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {project.completed} of {project.total} tasks complete
          </span>
          <span>
            {noteCount} {noteCount === 1 ? "note" : "notes"}
          </span>
        </div>
        <Progress
          value={project.total ? (project.completed / project.total) * 100 : 0}
          aria-label={`${project.name} task completion`}
        />
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3">
        <span className="text-xs text-muted-foreground">{project.updated}</span>
        <Link
          href={`/projects/${project.id}`}
          aria-label={`Open ${project.name}`}
          className="flex min-h-11 items-center gap-2 text-sm font-medium hover:underline underline-offset-4"
        >
          Open
          <ArrowRightIcon className="size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}

export function NoteCard({ note }: { note: DemoNote }) {
  const project = demoProjects.find((item) => item.id === note.projectId);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Link
            href={`/notes/${note.id}`}
            className="hover:underline underline-offset-4"
          >
            {note.title}
          </Link>
        </CardTitle>
        <CardDescription>{project?.name}</CardDescription>
        <CardAction>
          <BookOpenIcon className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {note.excerpt}
        </p>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-2">
        <span className="text-xs text-muted-foreground">{note.updated}</span>
        <Link
          href={`/notes/${note.id}`}
          aria-label={`Read ${note.title}`}
          className="flex min-h-11 items-center gap-2 text-sm font-medium"
        >
          Read
          <ArrowRightIcon className="size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}

export function TaskList({
  tasks,
  showProject = true,
}: {
  tasks: DemoTask[];
  showProject?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {tasks.map((task, index) => {
        const project = demoProjects.find((item) => item.id === task.projectId);
        return (
          <div key={task.id}>
            <div className="flex items-start gap-3 py-4 sm:gap-4">
              {/* TODO(product): Toggle completion and update task summaries. */}
              {/* TODO(PWA): Queue completion changes for synchronization. */}
              <div className="flex min-h-11 shrink-0 items-center px-1">
                <Checkbox
                  checked={task.completed}
                  readOnly
                  aria-label={`${task.title}: ${task.completed ? "completed" : "not completed"} (preview)`}
                />
              </div>
              <Link
                href={`/tasks/${task.id}`}
                className="group flex min-w-0 flex-1 flex-col gap-2 py-2"
              >
                <span
                  className={cn(
                    "text-sm font-medium leading-relaxed group-hover:underline underline-offset-4",
                    task.completed && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  {showProject && <span>{project?.name}</span>}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      task.group === "overdue" && "text-destructive",
                    )}
                  >
                    <CalendarDaysIcon className="size-3.5" />
                    {task.dueLabel}
                  </span>
                  {task.reminder && (
                    <span className="inline-flex items-center gap-1">
                      <BellIcon className="size-3.5" />
                      <span className="sr-only">Reminder set</span>
                    </span>
                  )}
                  {task.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <PaperclipIcon className="size-3.5" />
                      {task.attachments.length}
                      <span className="sr-only">attachments</span>
                    </span>
                  )}
                </span>
              </Link>
              <ArrowRightIcon className="mt-5 hidden size-4 shrink-0 text-muted-foreground sm:block" />
            </div>
            {index < tasks.length - 1 && <Separator />}
          </div>
        );
      })}
    </div>
  );
}
