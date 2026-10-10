import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { authCookieOptions, getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const config = getSupabaseConfig();
  let signedIn = false;

  if (config) {
    const client = createServerClient(config.url, config.key, {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
          for (const [name, value] of Object.entries(headers))
            response.headers.set(name, value);
          response.headers.set("Cache-Control", "private, no-store");
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    signedIn = !error && Boolean(data.user && !data.user.is_anonymous);
  }

  const publicAuthPage = ["/login", "/register"].includes(
    request.nextUrl.pathname,
  );
  if (!signedIn && !publicAuthPage) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    for (const name of ["Cache-Control", "Expires", "Pragma"]) {
      const value = response.headers.get(name);
      if (value) redirect.headers.set(name, value);
    }
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/", "/tasks/:path*", "/notes/:path*", "/login", "/register"],
};
