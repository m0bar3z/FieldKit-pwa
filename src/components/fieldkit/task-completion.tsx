"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useTransition } from "react";
import { toggleTaskCompletion } from "@/app/(workspace)/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { ProductActionState } from "@/lib/product-input";
import type { Task } from "@/lib/product-types";
import { useWorkspaceFeedback } from "./workspace-feedback";

export function TaskCompletion({
  task,
  label = false,
}: {
  task: Task;
  label?: boolean;
}) {
  const id = useId();
  const submitting = useRef(false);
  const { notify, setGuard } = useWorkspaceFeedback();
  const [state, dispatch, pending] = useActionState<
    ProductActionState,
    FormData
  >(async (previous, form) => {
    try {
      const result = await toggleTaskCompletion(previous, form);
      if (result.success) notify(result.success);
      return result;
    } catch (error) {
      unstable_rethrow(error);
      return { error: "Unable to update this task. Please try again." };
    } finally {
      submitting.current = false;
      setGuard(id, null);
    }
  }, {});
  const [, startTransition] = useTransition();
  useEffect(() => () => setGuard(id, null), [id, setGuard]);
  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id={id}
          checked={task.completed}
          disabled={pending}
          aria-label={`${task.title}: ${task.completed ? "mark incomplete" : "mark complete"}`}
          aria-describedby={state.error ? `${id}-error` : undefined}
          onCheckedChange={(completed) => {
            if (submitting.current || pending) return;
            submitting.current = true;
            setGuard(id, { dirty: false, pending: true });
            const form = new FormData();
            form.set("id", task.id);
            form.set("version", String(task.version));
            form.set("completed", String(completed));
            // TODO(PWA): Queue completion changes when offline mutation support is added.
            startTransition(() => dispatch(form));
          }}
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
      {state.error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="max-w-64 text-xs text-destructive"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}
