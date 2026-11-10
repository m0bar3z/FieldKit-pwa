"use client";

import { FieldGroup } from "@/components/ui/field";
import { ProductTextField } from "../forms/product-text-field";
import { TaskReminderField } from "./task-reminder-field";

export function ItemFields({
  kind,
  prefix,
}: {
  kind: "task" | "note";
  prefix: string;
}) {
  return (
    <FieldGroup>
      <ProductTextField
        id={`${prefix}-title`}
        name="title"
        label={`${kind === "task" ? "Task" : "Note"} title`}
        required
        maxLength={200}
      />
      {kind === "task" ? (
        <>
          <ProductTextField
            id={`${prefix}-description`}
            name="description"
            label="Description (optional)"
            maxLength={10000}
            multiline
          />
          <ProductTextField
            id={`${prefix}-due`}
            name="dueDate"
            label="Due date (optional)"
            maxLength={10}
            type="date"
          />
          <TaskReminderField id={`${prefix}-reminder`} />
        </>
      ) : (
        <ProductTextField
          id={`${prefix}-content`}
          name="content"
          label="Your note"
          maxLength={100000}
          multiline
        />
      )}
    </FieldGroup>
  );
}
