import type { Route } from "next";

export type SignInState = {
  error?: string;
  errors?: { email?: string; password?: string };
};

export type SignUpState = SignInState & { message?: string };

export function safeReturnPath(value: unknown): Route {
  return typeof value === "string" &&
    /^(?:\/|\/projects(?:\/[A-Za-z0-9_-]+)?|\/(?:tasks|notes)\/[A-Za-z0-9_-]+)$/.test(
      value,
    )
    ? (value as Route)
    : "/";
}

export function validateSignIn(formData: FormData) {
  const rawEmail = formData.get("email");
  const password = formData.get("password");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const errors: NonNullable<SignInState["errors"]> = {};
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (typeof password !== "string" || !password || password.length > 1024) {
    errors.password = "Enter your password.";
  }
  return {
    email,
    password: typeof password === "string" ? password : "",
    errors,
  };
}

export function validateSignUp(formData: FormData) {
  const result = validateSignIn(formData);
  if (!result.errors.password && result.password.length < 8) {
    result.errors.password = "Use at least 8 characters.";
  }
  return result;
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
