import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  let destination = "/login?confirmation=failed";
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  if (code && getSupabaseConfig()) {
    try {
      const client = await createAuthClient();
      const { error } = await client.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      if (!error) {
        const { data, error: verificationError } = await client.auth.getUser();
        if (!verificationError && data.user && !data.user.is_anonymous)
          destination = "/";
        else await client.auth.signOut({ scope: "local" });
      }
    } catch (error) {
      unstable_rethrow(error);
    }
  }
  // Relative redirects stay on this origin, strip the code, and preserve SSR cookies.
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
