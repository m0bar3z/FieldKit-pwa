import type { Route } from "next";
import { validationFields } from "@/lib/forms/validation";
import { signInSchema, signUpSchema } from "./schemas";

export type SignInState = {
  error?: string;
  errors?: { email?: string; password?: string };
};

export type SignUpState = SignInState & { message?: string };

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

export function validateSignUp(formData: FormData) {
  return validateCredentials(formData, signUpSchema);
}

export function registrationCallbackUrl(origin: string | null) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
      return null;
    return new URL("/auth/callback", url).href;
  } catch {
    return null;
  }
}
