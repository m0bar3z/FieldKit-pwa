"use server";

import { redirect } from "next/navigation";
import {
  type SignInState,
  safeReturnPath,
  validateSignIn,
} from "@/lib/auth-input";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createAuthClient } from "@/lib/supabase/server";

export async function signIn(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const { email, password, errors } = validateSignIn(formData);
  if (Object.keys(errors).length) return { errors };
  if (!getSupabaseConfig())
    return { error: "Sign-in is unavailable. Please try again later." };

  const client = await createAuthClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error)
    return {
      error:
        "Unable to sign in. Check your email and password, then try again.",
    };
  const { data, error: verificationError } = await client.auth.getUser();
  if (verificationError || !data.user || data.user.is_anonymous) {
    await client.auth.signOut({ scope: "local" });
    return { error: "Unable to verify your account. Please try again." };
  }
  redirect(safeReturnPath(formData.get("next")));
}

export async function signOut(): Promise<SignInState> {
  if (!getSupabaseConfig()) redirect("/login");
  const client = await createAuthClient();
  // This only clears/revokes the session supplied by this request's cookies.
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) return { error: "Unable to sign out. Please try again." };
  redirect("/login");
}
