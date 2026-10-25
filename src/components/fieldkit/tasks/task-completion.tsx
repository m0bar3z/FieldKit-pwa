"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { useUser } from "@/components/auth/user-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { useAppFeedback } from "@/hooks/use-app-feedback";
import { completionSchema } from "@/lib/products/schemas";
import { setTaskCompletion } from "@/lib/products/task-sync";
import type { Task } from "@/lib/products/types";

export function TaskCompletion({
  task,
  label = false,
}: {
  task: Task;
  label?: boolean;
}) {
  const id = useId();
  const { notify } = useAppFeedback();
  const user = useUser();
  const unavailable = !!task.deletionPending;
  const form = useForm<z.infer<typeof completionSchema>>({
    resolver: zodResolver(completionSchema),
    values: {
      id: task.id,
      version: String(task.version),
      completed: task.completed,
    },
  });
  const submitting = useRef(false);
  const pending = form.formState.isSubmitting;

  async function handleSubmit(values: z.infer<typeof completionSchema>) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await setTaskCompletion(user.id, task, values.completed);
      if (result.success) notify(result.success);
    } catch {
      form.setError("root.server", {
        message: "Unable to update this task. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }
  const errors = form.formState.errors;
  const error =
    errors.root?.server?.message ||
    errors.id?.message ||
    errors.version?.message ||
    errors.completed?.message;
  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      <div className="flex min-h-11 items-center gap-3">
        <Controller
          name="completed"
          control={form.control}
          render={({ field, fieldState }) => (
            <Checkbox
              ref={field.ref}
              name={field.name}
              onBlur={field.onBlur}
              id={id}
              checked={task.completed}
              disabled={pending || unavailable}
              title={
                unavailable
                  ? "Keep this task before changing completion."
                  : undefined
              }
              aria-invalid={fieldState.invalid}
              aria-label={`${task.title}: ${task.completed ? "mark incomplete" : "mark complete"}`}
              aria-describedby={error ? `${id}-error` : undefined}
              onCheckedChange={(completed) => {
                if (pending || unavailable || submitting.current) return;
                field.onChange(completed);
                void form.handleSubmit(handleSubmit)();
              }}
            />
          )}
        />
        {label && (
          <label htmlFor={id} className="text-sm font-medium">
            {pending
              ? "Saving…"
              : task.completed
                ? "Task completed"
                : "Mark as completed"}
          </label>
        )}
      </div>
      {pending && (
        <output className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner /> Saving…
        </output>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="max-w-64 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
