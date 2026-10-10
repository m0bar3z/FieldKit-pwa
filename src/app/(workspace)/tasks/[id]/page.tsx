import { BellIcon, CalendarDaysIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { Attachments } from "@/components/fieldkit/attachments";
import { DeleteDialog } from "@/components/fieldkit/delete-dialog";
import { EditItemDialog } from "@/components/fieldkit/editors";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { TaskCompletion } from "@/components/fieldkit/task-completion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isProductId } from "@/lib/product-input";
import { getWorkspace } from "@/lib/product-queries";

async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  if (!isProductId(id)) notFound();
  const workspace = await getWorkspace();
  const task = workspace.tasks.find((item) => item.id === id);
  if (!task) notFound();
  return (
    <>
      <PageHeading
        eyebrow="Task"
        title={task.title}
        description="A clear next step, with the details close at hand."
        back={{ href: "/tasks", label: "All tasks" }}
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
              <TaskCompletion task={task} label />
            </CardContent>
          </Card>
          <Attachments items={task.attachments} kind="task" parentId={id} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
            <CardDescription>Status, due date, and reminders.</CardDescription>
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
              <CalendarDaysIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due date</p>
                <p className="mt-1 text-sm">{task.dueLabel}</p>
              </div>
            </div>
            {/* TODO(product): Allow reminders to be set, edited, and removed. */}
            {/* TODO(PWA): Deliver reminders using push notifications later. */}
            <div className="flex items-start gap-3">
              <BellIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reminder</p>
                <p className="mt-1 text-sm">{task.reminderLabel}</p>
              </div>
            </div>
            <Separator />
            <DeleteDialog
              kind="task"
              title={task.title}
              id={id}
              version={task.version}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default withAuthentication(TaskPage);
