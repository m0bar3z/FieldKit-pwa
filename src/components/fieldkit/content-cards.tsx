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
import { WorkspaceLink as Link } from "@/components/fieldkit/workspace-link";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Note, Project, Task } from "@/lib/product-types";
import { cn } from "@/lib/utils";
import { TaskCompletion } from "./task-completion";

const projectIcons = {
  travel: PlaneIcon,
  work: BriefcaseBusinessIcon,
  personal: LeafIcon,
};

export function ProjectCard({ project }: { project: Project }) {
  const Icon = projectIcons[project.category];
  const noteCount = project.noteCount;
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
            {!project.total
              ? "New"
              : project.completed === project.total
                ? "Completed"
                : "In progress"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {project.completed} of {project.total} tasks complete ·{" "}
            {project.progress}%
          </span>
          <span>
            {noteCount} {noteCount === 1 ? "note" : "notes"}
          </span>
        </div>
        <Progress
          value={project.progress}
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

export function NoteCard({ note }: { note: Note }) {
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
        <CardDescription>{note.projectName}</CardDescription>
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
  tasks: Task[];
  showProject?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {tasks.map((task, index) => {
        return (
          <div key={task.id}>
            <div className="flex items-start gap-3 py-4 sm:gap-4">
              <div className="shrink-0 px-1">
                <TaskCompletion task={task} />
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
                  {showProject && <span>{task.projectName}</span>}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      task.group === "overdue" && "text-destructive",
                    )}
                  >
                    <CalendarDaysIcon className="size-3.5" />
                    {task.dueLabel}
                  </span>
                  {task.reminderAt && (
                    <span className="inline-flex items-center gap-1">
                      <BellIcon className="size-3.5" />
                      {task.reminderLabel}
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
