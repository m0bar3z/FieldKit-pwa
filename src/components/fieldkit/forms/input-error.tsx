"use client";

import { FieldError } from "@/components/ui/field";
import { useProductForm } from "@/hooks/use-product-form";

export function InputError({ name }: { name: string }) {
  const { state } = useProductForm();
  return state.fields?.[name] ? (
    <FieldError id={`${name}-error`}>{state.fields[name]}</FieldError>
  ) : null;
}
