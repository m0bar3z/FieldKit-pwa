import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { memory } from "@/lib/memory/store";
import { DEMO_ACCOUNT, DEMO_ACCOUNTS } from "./demo-account";

export const SESSION_COOKIE = "fieldkit-demo-session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

export function userFromSession(token?: string) {
  const now = Date.now();
  memory.sessions = memory.sessions.filter(
    (session) => session.expiresAt > now,
  );
  const session = memory.sessions.find((session) => session.token === token);
  if (!token || !session) return null;
  const account = DEMO_ACCOUNTS.find(
    (account) => account.id === session.userId,
  );
  if (!account) return null;
  // Never return the password or session token to client code.
  return { id: account.id, email: account.email };
}
export function removeSession(token?: string) {
  memory.sessions = memory.sessions.filter(
    (session) => session.token !== token,
  );
}
export function createSession(userId = DEMO_ACCOUNT.id) {
  userFromSession(); // Drop expired sessions before adding another.
  const token = randomBytes(32).toString("hex");
  memory.sessions.push({
    token,
    userId,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  });
  // Bound the demo's session array; old sessions can sign in again.
  if (memory.sessions.length > 100) memory.sessions.shift();
  return token;
}
export const getCurrentUser = cache(async () => {
  return userFromSession((await cookies()).get(SESSION_COOKIE)?.value);
});
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
