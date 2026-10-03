import { BellIcon, CalendarDaysIcon, FolderIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { Attachments } from "@/components/fieldkit/attachments";
import { DeleteDialog } from "@/components/fieldkit/delete-dialog";
import { EditItemDialog } from "@/components/fieldkit/editors";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { demoProjects, demoTasks } from "@/lib/demo-content";

export function generateStaticParams() {
  return demoTasks.map(({ id }) => ({ id }));
}

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  // TODO(data): Load the task, its project, and attachments when data fetching is enabled.
  const task = demoTasks.find((item) => item.id === id);
  if (!task) notFound();
  const project = demoProjects.find((item) => item.id === task.projectId);
  if (!project) notFound();
  return (
    <>
      <PageHeading
        eyebrow={project.name}
        title={task.title}
        description="A clear next step, with the details close at hand."
        back={{ href: `/projects/${project.id}`, label: "Back to project" }}
        actions={<EditItemDialog task={task} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>The details</CardTitle>
              <CardDescription>
                A little context for when you’re ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <p className="text-sm leading-7">{task.description}</p>
              <Separator />
              {/* TODO(product): Persist completion changes and update related counts. */}
              {/* TODO(PWA): Queue task mutations when offline. */}
              <Field orientation="horizontal">
                <Checkbox
                  id="task-completion"
                  checked={task.completed}
                  readOnly
                />
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="task-completion">
                    {task.completed ? "Task completed" : "Mark as completed"}
                  </FieldLabel>
                  <FieldDescription>
                    Completion is read-only in this preview.
                  </FieldDescription>
                </div>
              </Field>
            </CardContent>
          </Card>
          <Attachments items={task.attachments} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
            <CardDescription>The where and when.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Badge
              variant={
                task.completed
                  ? "secondary"
                  : task.group === "overdue"
                    ? "destructive"
                    : "outline"
              }
            >
              {task.completed
                ? "Completed"
                : task.group === "overdue"
                  ? "Overdue"
                  : "Open task"}
            </Badge>
            <div className="flex items-start gap-3">
              <FolderIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">Project</p>
                <LinkButton
                  href={`/projects/${project.id}`}
                  variant="link"
                  className="min-h-0 justify-start p-0"
                >
                  {project.name}
                </LinkButton>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDaysIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due date</p>
                <p className="mt-1 text-sm">
                  {task.dueLabel} · {task.dueDate}
                </p>
              </div>
            </div>
            {/* TODO(product): Allow reminders to be set, edited, and removed. */}
            {/* TODO(PWA): Deliver reminders using push notifications later. */}
            <div className="flex items-start gap-3">
              <BellIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reminder</p>
                <p className="mt-1 text-sm">
                  {task.reminder
                    ? task.reminder.replace("T", " at ")
                    : "No reminder set"}
                </p>
              </div>
            </div>
            <Separator />
            <DeleteDialog kind="task" title={task.title} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
