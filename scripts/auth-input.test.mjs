import assert from "node:assert/strict";
import test from "node:test";
import {
  registrationCallbackUrl,
  safeReturnPath,
  validateSignIn,
  validateSignUp,
} from "../src/lib/auth-input.ts";

test("return paths stay inside known workspace routes", () => {
  for (const path of ["/tasks", "/notes", "/tasks/new", "/notes/note_1"]) {
    assert.equal(safeReturnPath(path), path);
  }
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/login",
    "/projects",
    "/projects/trip",
    "/tasks/../login",
    ["/tasks"],
    null,
  ]) {
    assert.equal(safeReturnPath(path), "/");
  }
});

test("sign-in normalizes email but preserves password characters", () => {
  const form = new FormData();
  form.set("email", "  account@example.com  ");
  form.set("password", " leading and trailing spaces ");
  assert.deepEqual(validateSignIn(form), {
    email: "account@example.com",
    password: " leading and trailing spaces ",
    errors: {},
  });
});

test("missing and malformed credentials are rejected", () => {
  const form = new FormData();
  assert.deepEqual(Object.keys(validateSignIn(form).errors), [
    "email",
    "password",
  ]);
  form.set("email", "not-an-email");
  form.set("password", new Blob(["not a password"]), "password.txt");
  assert.deepEqual(Object.keys(validateSignIn(form).errors), [
    "email",
    "password",
  ]);
  form.set("email", `${"a".repeat(255)}@example.com`);
  form.set("password", "x".repeat(1025));
  assert.deepEqual(Object.keys(validateSignIn(form).errors), [
    "email",
    "password",
  ]);
});

test("registration enforces password length while preserving credentials", () => {
  const form = new FormData();
  form.set("email", "  account@example.com  ");
  form.set("password", "short");
  assert.equal(
    validateSignUp(form).errors.password,
    "Use at least 8 characters.",
  );
  form.set("password", " leading and trailing spaces ");
  assert.deepEqual(validateSignUp(form), {
    email: "account@example.com",
    password: " leading and trailing spaces ",
    errors: {},
  });
  form.set("password", new Blob(["not a password"]), "password.txt");
  assert.equal(validateSignUp(form).errors.password, "Enter your password.");
});

test("registration redirects require an HTTP origin and use a fixed callback", () => {
  assert.equal(
    registrationCallbackUrl("http://localhost:3000"),
    "http://localhost:3000/auth/callback",
  );
  assert.equal(
    registrationCallbackUrl("https://fieldkit.example"),
    "https://fieldkit.example/auth/callback",
  );
  for (const origin of [
    null,
    "null",
    "javascript:alert(1)",
    "//evil.example",
    "https://user:password@fieldkit.example",
    "https://fieldkit.example/elsewhere",
    "https://fieldkit.example?next=evil",
  ])
    assert.equal(registrationCallbackUrl(origin), null);
});
