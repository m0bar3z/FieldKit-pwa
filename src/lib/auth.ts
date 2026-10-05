import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { getSupabaseConfig } from "./supabase/config";
import { createAuthClient } from "./supabase/server";

// React cache deduplicates within a render; it never shares identities across requests.
export const getCurrentUser = cache(async () => {
  if (!getSupabaseConfig()) return null;
  const client = await createAuthClient();
  // Verify with the Auth server; never authorize using cookie-only getSession().
  const { data, error } = await client.auth.getUser();
  return error || !data.user || data.user.is_anonymous ? null : data.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
