"use client";

import { Controller, useFormContext } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Credentials } from "@/lib/auth/schemas";

export function CredentialsFields({ disabled }: { disabled: boolean }) {
  const { control } = useFormContext<Credentials>();
  return (
    <FieldGroup>
      {(["email", "password"] as const).map((name) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
              <FieldLabel htmlFor={name}>
                {name === "email" ? "Email" : "Password"}
              </FieldLabel>
              <Input
                {...field}
                id={name}
                type={name}
                autoComplete={
                  name === "email" ? "username" : "current-password"
                }
                required
                maxLength={name === "email" ? 254 : 1024}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? `${name}-error` : undefined
                }
              />
              {fieldState.error && (
                <FieldError id={`${name}-error`} errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      ))}
    </FieldGroup>
  );
}
