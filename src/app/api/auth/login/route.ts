import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { simulateApiDelay } from "@/lib/api/delay";
import { ApiError } from "@/lib/api/errors";
import {
  apiFailure,
  checkOrigin,
  privateHeaders,
  readJson,
} from "@/lib/api/server";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { safeReturnPath } from "@/lib/auth/input";
import { signInSchema } from "@/lib/auth/schemas";
import {
  createSession,
  removeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await simulateApiDelay();
    checkOrigin(request);
    const body = await readJson(request);
    const credentials = signInSchema
      .extend({ next: z.unknown().optional() })
      .parse(body);
    if (
      credentials.email !== DEMO_ACCOUNT.email ||
      credentials.password !== DEMO_ACCOUNT.password
    )
      throw new ApiError("Check your email and password, then try again.", 401);
    removeSession((await cookies()).get(SESSION_COOKIE)?.value);
    const token = createSession();
    const response = NextResponse.json(
      { success: "Signed in.", destination: safeReturnPath(credentials.next) },
      { headers: privateHeaders },
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
