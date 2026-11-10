"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  reminderLocalTime,
  reminderTimestamp,
} from "@/lib/products/reminder-time";
import { InputError } from "../forms/input-error";

export function TaskReminderField({ id }: { id: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="reminderAt"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>Reminder (optional)</FieldLabel>
          <Input
            id={id}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            type="datetime-local"
            value={
              Number.isNaN(field.value) ? "" : reminderLocalTime(field.value)
            }
            onChange={(event) =>
              field.onChange(reminderTimestamp(event.target.value))
            }
            aria-invalid={fieldState.invalid}
            aria-describedby={`${id}-help ${id}-error`}
            className="min-h-11"
          />
          <FieldDescription id={`${id}-help`}>
            Uses this device’s local time. Enable task reminders in the header
            to receive notifications. Offline changes take effect after syncing.
          </FieldDescription>
          <InputError name="reminderAt" id={`${id}-error`} />
        </Field>
      )}
    />
  );
}
