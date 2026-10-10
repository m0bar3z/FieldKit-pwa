import {
  ArrowRightIcon,
  BellIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  PaperclipIcon,
} from "lucide-react";
import { WorkspaceLink as Link } from "@/components/fieldkit/workspace-link";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Note, Task } from "@/lib/product-types";
import { cn } from "@/lib/utils";
import { TaskCompletion } from "./task-completion";

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

export function TaskList({ tasks }: { tasks: Task[] }) {
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
