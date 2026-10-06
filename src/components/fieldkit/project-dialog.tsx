"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createProject, updateProject } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { Project } from "@/lib/product-types";
import {
  InputError,
  ProductForm,
  ProductTextField,
  SaveButton,
  useProductForm,
} from "./product-form";
import { type FormStatus, useWorkspaceFeedback } from "./workspace-feedback";

function ProjectFields({ project }: { project?: Project | undefined }) {
  const { state } = useProductForm();
  const initialCategory = project?.category ?? "personal";
  const [category, setCategory] = useState<string>(initialCategory);
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  return (
    <FieldGroup>
      {project && (
        <>
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="version" value={project.version} />
        </>
      )}
      <ProductTextField
        id="project-name"
        name="name"
        label="Project name"
        value={project?.name}
        maxLength={120}
        required
      />
      <ProductTextField
        id="project-description"
        name="description"
        label="Description (optional)"
        value={project?.description}
        maxLength={5000}
        multiline
      />
      <Field data-invalid={Boolean(state.fields?.category)}>
        <FieldLabel htmlFor="project-category">Category</FieldLabel>
        <NativeSelect
          id="project-category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-invalid={Boolean(state.fields?.category)}
          aria-describedby={
            state.fields?.category ? "category-error" : undefined
          }
          className="w-full [&_select]:min-h-11"
        >
          <NativeSelectOption value="personal">Personal</NativeSelectOption>
          <NativeSelectOption value="work">Work</NativeSelectOption>
          <NativeSelectOption value="travel">Travel</NativeSelectOption>
        </NativeSelect>
        <InputError name="category" />
      </Field>
    </FieldGroup>
  );
}

export function ProjectDialog({ project }: { project?: Project }) {
  const editing = Boolean(project);
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
        render={
          <Button
            variant={editing ? "outline" : "default"}
            className="min-h-11 gap-2 px-4"
          />
        }
      >
        {editing ? (
          <PencilIcon data-icon="inline-start" />
        ) : (
          <PlusIcon data-icon="inline-start" />
        )}
        {editing ? "Edit project" : "New project"}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit project" : "Make space for a new project"}
          </DialogTitle>
          <DialogDescription>
            Keep related tasks and notes together.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          action={editing ? updateProject : createProject}
          onStatusChange={setStatus}
          onSuccess={() => setOpen(false)}
        >
          <ProjectFields project={project} />
          {/* TODO(PWA): Persist project changes locally and queue synchronization. */}
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" className="min-h-11" />}
            >
              Cancel
            </DialogClose>
            <SaveButton>
              {editing ? "Save changes" : "Create project"}
            </SaveButton>
          </DialogFooter>
        </ProductForm>
      </DialogContent>
    </Dialog>
  );
}
