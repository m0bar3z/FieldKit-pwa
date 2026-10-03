import { BellIcon, PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { type DemoNote, type DemoTask, demoProjects } from "@/lib/demo-content";
import { LinkButton } from "./link-button";
import { PreviewForm } from "./preview-form";

function ProjectField({
  id,
  value,
}: {
  id: string;
  value?: string | undefined;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Project</FieldLabel>
      <NativeSelect
        id={id}
        name="project"
        defaultValue={value ?? ""}
        className="w-full [&_select]:min-h-11"
      >
        <NativeSelectOption value="" disabled>
          Choose a project
        </NativeSelectOption>
        {demoProjects.map((project) => (
          <NativeSelectOption key={project.id} value={project.id}>
            {project.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldDescription>A home for this task or note.</FieldDescription>
    </Field>
  );
}

function TaskFields({ task, prefix }: { task?: DemoTask; prefix: string }) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${prefix}-title`}>Task title</FieldLabel>
        <Input
          id={`${prefix}-title`}
          name="title"
          placeholder="What would you like to get done?"
          defaultValue={task?.title}
          className="min-h-11"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${prefix}-description`}>
          Description <span className="text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          placeholder="Add a little context, a link, or a next step…"
          defaultValue={task?.description}
          className="min-h-32"
        />
      </Field>
      <ProjectField id={`${prefix}-project`} value={task?.projectId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${prefix}-due`}>
            Due date <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            type="date"
            id={`${prefix}-due`}
            name="dueDate"
            defaultValue={task?.dueDate}
            className="min-h-11"
          />
        </Field>
        {/* TODO(product): Store and validate reminder dates without scheduling any delivery yet. */}
        {/* TODO(PWA): Schedule and deliver push reminders in the notifications phase. */}
        <Field>
          <FieldLabel htmlFor={`${prefix}-reminder`}>
            <BellIcon className="size-4" />
            Reminder <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            type="datetime-local"
            id={`${prefix}-reminder`}
            name="reminder"
            defaultValue={task?.reminder}
            className="min-h-11"
          />
        </Field>
      </div>
      {/* TODO(product): Add title validation, field errors, and pending/success/error save states. */}
    </FieldGroup>
  );
}

function NoteFields({
  note,
  prefix,
}: {
  note?: DemoNote | undefined;
  prefix: string;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${prefix}-title`}>Note title</FieldLabel>
        <Input
          id={`${prefix}-title`}
          name="title"
          placeholder="Give your idea a name"
          defaultValue={note?.title}
          className="min-h-11"
        />
      </Field>
      <ProjectField id={`${prefix}-project`} value={note?.projectId} />
      <Field>
        <FieldLabel htmlFor={`${prefix}-content`}>Your note</FieldLabel>
        <Textarea
          id={`${prefix}-content`}
          name="content"
          defaultValue={note?.paragraphs.join("\n\n")}
          placeholder="A thought, a plan, something worth remembering…"
          className="min-h-72"
        />
        <FieldDescription>
          Keep it simple. Plain text is all you need.
        </FieldDescription>
      </Field>
      {/* TODO(product): Validate and save note title, content, and project association. */}
    </FieldGroup>
  );
}

export function NewItemEditor({ kind }: { kind: "task" | "note" }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {kind === "task"
            ? "One clear next step"
            : "Give your ideas a little space"}
        </CardTitle>
        <CardDescription>
          {kind === "task"
            ? "Start with a title. The rest is up to you."
            : "Capture the details you want to come back to."}
        </CardDescription>
      </CardHeader>
      <PreviewForm>
        <CardContent className="flex flex-col gap-6">
          {kind === "task" ? (
            <TaskFields prefix="new-task" />
          ) : (
            <NoteFields prefix="new-note" />
          )}
          <Separator />
          <FieldGroup>
            <Field>
              <FieldTitle>Attachments</FieldTitle>
              <Button
                type="button"
                variant="outline"
                disabled
                className="min-h-11 w-fit gap-2"
              >
                <PlusIcon data-icon="inline-start" />
                Add an image or file
              </Button>
              <FieldDescription>
                Design preview. Uploads and saving are not available yet.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        {/* TODO(product): Connect creation and uploads, then navigate to the new item. */}
        {/* TODO(PWA): Save drafts and attachments locally when offline support is developed. */}
        <CardFooter className="mt-6 flex-wrap justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Changes are not saved in this preview.
          </p>
          <div className="flex items-center gap-2">
            <LinkButton href="/projects" variant="outline">
              Cancel
            </LinkButton>
            <Button type="submit" disabled className="min-h-11 gap-2 px-4">
              <PlusIcon data-icon="inline-start" />
              Create {kind}
            </Button>
          </div>
        </CardFooter>
      </PreviewForm>
    </Card>
  );
}

export function EditItemDialog({
  task,
  note,
}: {
  task?: DemoTask;
  note?: DemoNote;
}) {
  const kind = task ? "task" : "note";
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" className="min-h-11 gap-2 px-4" />}
      >
        <PencilIcon data-icon="inline-start" />
        Edit {kind}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit {kind}</DialogTitle>
          <DialogDescription>
            Make a little room for a better plan.
          </DialogDescription>
        </DialogHeader>
        <PreviewForm>
          {task ? (
            <TaskFields task={task} prefix="edit-task" />
          ) : (
            <NoteFields note={note} prefix="edit-note" />
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Design preview. Changes are not saved.
          </p>
          <DialogFooter className="mt-5">
            <DialogClose
              render={<Button variant="outline" className="min-h-11" />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled className="min-h-11">
              Save changes
            </Button>
          </DialogFooter>
        </PreviewForm>
      </DialogContent>
    </Dialog>
  );
}
