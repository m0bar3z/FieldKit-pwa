"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputError } from "./input-error";

export function ProductTextField({
  id,
  name,
  label,
  maxLength,
  required = false,
  multiline = false,
  type = "text",
}: {
  id: string;
  name: string;
  label: string;
  maxLength: number;
  required?: boolean;
  multiline?: boolean;
  type?: "text" | "date";
}) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const props = {
          ...field,
          value: field.value ?? "",
          id,
          maxLength,
          required,
          "aria-invalid": fieldState.invalid,
          "aria-describedby": fieldState.error ? `${id}-error` : undefined,
        };
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {multiline ? (
              <Textarea
                {...props}
                className={name === "content" ? "min-h-72" : "min-h-24"}
              />
            ) : (
              <Input {...props} type={type} className="min-h-11" />
            )}
            <InputError name={name} id={`${id}-error`} />
          </Field>
        );
      }}
    />
  );
}
