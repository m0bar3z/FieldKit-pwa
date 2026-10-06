"use client";

import { PencilIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createNote,
  createTask,
  updateNote,
  updateTask,
} from "@/app/(workspace)/actions";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import type { Note, Project, Task } from "@/lib/product-types";
import { LinkButton } from "./link-button";
import {
  InputError,
  ProductForm,
  ProductTextField,
  SaveButton,
  useProductForm,
} from "./product-form";
import { type FormStatus, useWorkspaceFeedback } from "./workspace-feedback";

function ItemFields({
  kind,
  projects,
  task,
  note,
  projectId,
  prefix,
}: {
  kind: "task" | "note";
  projects: Project[];
  task?: Task | undefined;
  note?: Note | undefined;
  projectId?: string | undefined;
  prefix: string;
}) {
  const item = task ?? note;
  const { state } = useProductForm();
  const initialProjectId = item?.projectId ?? projectId ?? "";
  const [selectedProject, setSelectedProject] = useState(initialProjectId);
  useEffect(() => setSelectedProject(initialProjectId), [initialProjectId]);
  return (
    <FieldGroup>
      {item && (
        <>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="version" value={item.version} />
        </>
      )}
      <ProductTextField
        id={`${prefix}-title`}
        name="title"
        label={`${kind === "task" ? "Task" : "Note"} title`}
        value={item?.title}
        required
        maxLength={200}
      />
      <Field data-invalid={Boolean(state.fields?.projectId)}>
        <FieldLabel htmlFor={`${prefix}-project`}>Project</FieldLabel>
        <NativeSelect
          id={`${prefix}-project`}
          name="projectId"
          value={selectedProject}
          onChange={(event) => setSelectedProject(event.target.value)}
          required
          aria-invalid={Boolean(state.fields?.projectId)}
          aria-describedby={
            state.fields?.projectId ? "projectId-error" : undefined
          }
          className="w-full [&_select]:min-h-11"
        >
          <NativeSelectOption value="" disabled>
            Choose a project
          </NativeSelectOption>
          {projects.map((project) => (
            <NativeSelectOption key={project.id} value={project.id}>
              {project.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <InputError name="projectId" />
      </Field>
      {kind === "task" ? (
        <>
          <ProductTextField
            id={`${prefix}-description`}
            name="description"
            label="Description (optional)"
            value={task?.description}
            maxLength={10000}
            multiline
          />
          <ProductTextField
            id={`${prefix}-due`}
            name="dueDate"
            label="Due date (optional)"
            value={task?.dueDate}
            maxLength={10}
            type="date"
          />
          {/* TODO(product): Add reminder editing in the reminders feature. */}
          {/* TODO(PWA): Schedule and deliver push reminders in the notifications phase. */}
        </>
      ) : (
        <ProductTextField
          id={`${prefix}-content`}
          name="content"
          label="Your note"
          value={note?.content}
          maxLength={100000}
          multiline
        />
      )}
    </FieldGroup>
  );
}

export function NewItemEditor({
  kind,
  projects,
  projectId,
}: {
  kind: "task" | "note";
  projects: Project[];
  projectId?: string | undefined;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {kind === "task"
            ? "One clear next step"
            : "Give your ideas a little space"}
        </CardTitle>
        <CardDescription>
          {projects.length
            ? "Start with a title and choose a project."
            : "Create a project before adding tasks or notes."}
        </CardDescription>
      </CardHeader>
      <ProductForm action={kind === "task" ? createTask : createNote}>
        <CardContent className="flex flex-col gap-6">
          <ItemFields
            kind={kind}
            projects={projects}
            projectId={projectId}
            prefix={`new-${kind}`}
          />
          <Separator />
          <FieldGroup>
            <Field>
              <FieldTitle>Attachments</FieldTitle>
              <FieldDescription>
                Create this {kind} first, then add files on its detail page.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        {/* TODO(PWA): Save drafts and attachments locally when offline support is developed. */}
        <CardFooter className="flex-wrap justify-end gap-4">
          <LinkButton href="/projects" variant="outline">
            {projects.length ? "Cancel" : "Create a project"}
          </LinkButton>
          <SaveButton disabled={!projects.length}>Create {kind}</SaveButton>
        </CardFooter>
      </ProductForm>
    </Card>
  );
}

export function EditItemDialog({
  task,
  note,
  projects,
}: {
  task?: Task;
  note?: Note;
  projects: Project[];
}) {
  const kind = task ? "task" : "note";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FormStatus>({
    dirty: false,
    pending: false,
  });
  const { requestLeave } = useWorkspaceFeedback();
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (!next && (status.dirty || status.pending)) {
          details.cancel();
          requestLeave(() => setOpen(false));
        } else setOpen(next);
      }}
    >
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
        <ProductForm
          action={task ? updateTask : updateNote}
          onStatusChange={setStatus}
          onSuccess={() => setOpen(false)}
        >
          <ItemFields
            kind={kind}
            projects={projects}
            task={task}
            note={note}
            prefix={`edit-${kind}`}
          />
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" className="min-h-11" />}
            >
              Cancel
            </DialogClose>
            <SaveButton>Save changes</SaveButton>
          </DialogFooter>
        </ProductForm>
      </DialogContent>
    </Dialog>
  );
}
