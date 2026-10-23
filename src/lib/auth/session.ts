import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { DEMO_ACCOUNT, DEMO_ACCOUNTS } from "./demo-account";

export const SESSION_COOKIE = "fieldkit-demo-session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ISSUER = "fieldkit";
const SESSION_AUDIENCE = "fieldkit-demo";
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error(
      "Set SESSION_SECRET to a random value of at least 32 bytes.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function userFromSession(token?: string) {
  if (!token) return null;
  const key = sessionKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      requiredClaims: ["sub", "exp", "iat", "jti"],
    });
    const account = DEMO_ACCOUNTS.find((account) => account.id === payload.sub);
    return account ? { id: account.id, email: account.email } : null;
  } catch {
    return null;
  }
}

export async function createSession(userId = DEMO_ACCOUNT.id) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .setJti(crypto.randomUUID())
    .sign(sessionKey());
}
export const getCurrentUser = cache(async () => {
  return userFromSession((await cookies()).get(SESSION_COOKIE)?.value);
});
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
