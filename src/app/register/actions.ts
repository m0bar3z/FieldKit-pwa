"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  registrationCallbackUrl,
  type SignUpState,
  validateSignUp,
} from "@/lib/auth-input";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createAuthClient } from "@/lib/supabase/server";

export async function signUp(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const { email, password, errors } = validateSignUp(formData);
  if (Object.keys(errors).length) return { errors };
  if (!getSupabaseConfig())
    return { error: "Registration is unavailable. Please try again later." };
  if (await getCurrentUser()) redirect("/");

  // Next.js checks the action's Origin against Host; Supabase also allowlists redirects.
  const emailRedirectTo = registrationCallbackUrl(
    (await headers()).get("origin"),
  );
  if (!emailRedirectTo)
    return {
      error: "Unable to create an account. Please refresh and try again.",
    };

  const client = await createAuthClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) {
    if (error.code === "weak_password")
      return { errors: { password: "Choose a stronger password." } };
    if (error.code === "over_email_send_rate_limit" || error.status === 429)
      return { error: "Too many attempts. Please wait before trying again." };
    return { error: "Unable to create an account. Please try again later." };
  }

  if (data.session) {
    const { data: verified, error: verificationError } =
      await client.auth.getUser();
    if (verificationError || !verified.user || verified.user.is_anonymous) {
      await client.auth.signOut({ scope: "local" });
      return { error: "Account created. Please sign in to continue." };
    }
    redirect("/");
  }

  // Supabase can return an obfuscated result for existing accounts; don't expose it.
  return {
    message:
      "Check your email for a confirmation link, then sign in. If you already have an account, you can sign in now.",
  };
}
