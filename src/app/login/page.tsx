import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { safeReturnPath } from "@/lib/auth-input";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

async function SignInContent({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1>Sign in to FieldKit</h1>
        </CardTitle>
        <CardDescription>
          A place for your notes, tasks, and everyday plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm next={next} configured={Boolean(getSupabaseConfig())} />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Use your FieldKit account to open your workspace.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10">
      <Suspense fallback={<output>Loading sign-in…</output>}>
        <SignInContent {...props} />
      </Suspense>
    </main>
  );
}
