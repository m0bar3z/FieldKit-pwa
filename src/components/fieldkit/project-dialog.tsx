import { PencilIcon, PlusIcon } from "lucide-react";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DemoProject } from "@/lib/demo-content";
import { PreviewForm } from "./preview-form";

export function ProjectDialog({ project }: { project?: DemoProject }) {
  const editing = Boolean(project);
  return (
    <Dialog>
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
        <PreviewForm>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="project-name">Project name</FieldLabel>
              <Input
                id="project-name"
                name="name"
                className="min-h-11"
                placeholder="e.g. A weekend away"
                defaultValue={project?.name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="project-description"
                name="description"
                placeholder="What is this project about?"
                defaultValue={project?.description}
                className="min-h-24"
              />
              <FieldDescription>
                Design preview. Changes are not saved.
              </FieldDescription>
            </Field>
          </FieldGroup>
          {/* TODO(product): Validate and create or update the project, then show success/error feedback. */}
          {/* TODO(PWA): Persist project changes locally and queue synchronization. */}
          <DialogFooter className="mt-6">
            <DialogClose
              render={<Button variant="outline" className="min-h-11" />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled className="min-h-11">
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </PreviewForm>
      </DialogContent>
    </Dialog>
  );
}
