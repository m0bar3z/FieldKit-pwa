"use client";

import { FieldGroup } from "@/components/ui/field";
import type { Note, Task } from "@/lib/products/types";
import { ProductTextField } from "../forms/product-text-field";

export function ItemFields({
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
