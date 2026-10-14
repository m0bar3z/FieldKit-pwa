import type { Route } from "next";
import { validationFields } from "@/lib/forms/validation";
import { signInSchema } from "./schemas";

export type SignInState = {
  error?: string;
  errors?: { email?: string; password?: string };
};

export function safeReturnPath(value: unknown): Route {
  return typeof value === "string" &&
    /^(?:\/|\/(?:tasks|notes)(?:\/[A-Za-z0-9_-]+)?)$/.test(value)
    ? (value as Route)
    : "/";
}

function validateCredentials(formData: FormData, schema: typeof signInSchema) {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const result = schema.safeParse({ email: rawEmail, password: rawPassword });
  const errors: NonNullable<SignInState["errors"]> = result.success
    ? {}
    : validationFields(result.error);
  return {
    email: result.success
      ? result.data.email
      : typeof rawEmail === "string"
        ? rawEmail.trim()
        : "",
    password: result.success
      ? result.data.password
      : typeof rawPassword === "string"
        ? rawPassword
        : "",
    errors,
  };
}

export function validateSignIn(formData: FormData) {
  return validateCredentials(formData, signInSchema);
}
