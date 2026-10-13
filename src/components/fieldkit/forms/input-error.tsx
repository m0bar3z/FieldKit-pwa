"use client";

import { useFormContext } from "react-hook-form";
import { FieldError } from "@/components/ui/field";

export function InputError({ name, id }: { name: string; id: string }) {
  const { getFieldState, formState } = useFormContext();
  const error = getFieldState(name, formState).error;
  return error ? <FieldError id={id} errors={[error]} /> : null;
}
