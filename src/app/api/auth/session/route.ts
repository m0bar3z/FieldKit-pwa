import { NextResponse } from "next/server";
import { simulateApiDelay } from "@/lib/api/delay";
import {
  apiFailure,
  checkOrigin,
  jsonResponse,
  privateHeaders,
} from "@/lib/api/server";
import {
  getCurrentUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

export async function GET() {
  await simulateApiDelay();
  const user = await getCurrentUser();
  return jsonResponse(
    user ? { user } : { error: "Sign in to continue." },
    user ? 200 : 401,
  );
}
export async function DELETE(request: Request) {
  try {
    await simulateApiDelay();
    checkOrigin(request);
    const response = NextResponse.json(
      { success: "Signed out." },
      { headers: privateHeaders },
    );
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions,
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
