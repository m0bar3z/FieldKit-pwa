import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnPath, validateSignIn } from "../src/lib/auth-input.ts";

test("return paths stay inside known workspace routes", () => {
  for (const path of [
    "/projects",
    "/projects/trip",
    "/tasks/new",
    "/notes/note_1",
  ]) {
    assert.equal(safeReturnPath(path), path);
  }
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/login",
    "/projects/../login",
    ["/projects"],
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
