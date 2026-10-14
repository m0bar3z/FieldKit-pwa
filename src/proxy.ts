import { type NextRequest, NextResponse } from "next/server";

export function proxy(_request: NextRequest) {
  // Session checks live in pages and APIs; Proxy may run in another process.
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/", "/tasks/:path*", "/notes/:path*", "/login"],
};
