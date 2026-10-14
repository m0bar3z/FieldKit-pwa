import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  apiFailure,
  checkOrigin,
  jsonResponse,
  privateHeaders,
} from "@/lib/api/server";
import {
  getCurrentUser,
  removeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  return jsonResponse(
    user ? { user } : { error: "Sign in to continue." },
    user ? 200 : 401,
  );
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    removeSession((await cookies()).get(SESSION_COOKIE)?.value);
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
