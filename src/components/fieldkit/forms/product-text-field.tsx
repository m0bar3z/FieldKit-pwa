"use client";

import { useEffect, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProductForm } from "@/hooks/use-product-form";
import { InputError } from "./input-error";

export function ProductTextField({
  id,
  name,
  label,
  value,
  maxLength,
  required = false,
  multiline = false,
  type = "text",
}: {
  id: string;
  name: string;
  label: string;
  value?: string | undefined;
  maxLength: number;
  required?: boolean;
  multiline?: boolean;
  type?: "text" | "date";
}) {
  const { state } = useProductForm();
  const error = state.fields?.[name];
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const props = {
    id,
    name,
    value: draft,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setDraft(event.target.value),
    maxLength,
    required,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${name}-error` : undefined,
  };
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          {...props}
          className={name === "content" ? "min-h-72" : "min-h-24"}
        />
      ) : (
        <Input {...props} type={type} className="min-h-11" />
      )}
      <InputError name={name} />
    </Field>
  );
}
