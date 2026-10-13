"use client";

import { Controller, useFormContext } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Credentials } from "@/lib/auth/schemas";

export function CredentialsFields({
  registration = false,
  disabled,
}: {
  registration?: boolean;
  disabled: boolean;
}) {
  const { control } = useFormContext<Credentials>();
  const emailId = registration ? "register-email" : "email";
  const passwordId = registration ? "register-password" : "password";
  return (
    <FieldGroup>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldLabel htmlFor={emailId}>Email</FieldLabel>
            <Input
              {...field}
              id={emailId}
              type="email"
              autoComplete={registration ? "email" : "username"}
              required
              maxLength={254}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-describedby={
                fieldState.error ? `${emailId}-error` : undefined
              }
            />
            {fieldState.error && (
              <FieldError id={`${emailId}-error`} errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
            <Input
              {...field}
              id={passwordId}
              type="password"
              autoComplete={registration ? "new-password" : "current-password"}
              required
              minLength={registration ? 8 : undefined}
              maxLength={1024}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-describedby={
                fieldState.error
                  ? `${passwordId}-error`
                  : registration
                    ? `${passwordId}-help`
                    : undefined
              }
            />
            {registration && (
              <FieldDescription id={`${passwordId}-help`}>
                Use at least 8 characters.
              </FieldDescription>
            )}
            {fieldState.error && (
              <FieldError
                id={`${passwordId}-error`}
                errors={[fieldState.error]}
              />
            )}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
