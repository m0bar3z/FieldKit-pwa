"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
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
  FieldTitle,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import type { Note, Task } from "@/lib/product-types";
import { LinkButton } from "./link-button";
import { ProductForm, ProductTextField, SaveButton } from "./product-form";
import { type FormStatus, useWorkspaceFeedback } from "./workspace-feedback";

function ItemFields({
  kind,
  task,
  note,
  prefix,
}: {
  kind: "task" | "note";
  task?: Task | undefined;
  note?: Note | undefined;
  prefix: string;
}) {
  const item = task ?? note;
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
          Start with a title. Everything stays in your personal workspace.
        </CardDescription>
      </CardHeader>
      <ProductForm action={kind === "task" ? createTask : createNote}>
        <CardContent className="flex flex-col gap-6">
          <ItemFields kind={kind} prefix={`new-${kind}`} />
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
          <LinkButton
            href={kind === "task" ? "/tasks" : "/notes"}
            variant="outline"
          >
            Cancel
          </LinkButton>
          <SaveButton>Create {kind}</SaveButton>
        </CardFooter>
      </ProductForm>
    </Card>
  );
}

export function EditItemDialog({ task, note }: { task?: Task; note?: Note }) {
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
