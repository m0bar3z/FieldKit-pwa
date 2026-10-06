import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account" };

async function RegistrationContent() {
  if (await getCurrentUser()) redirect("/");
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1>Create your FieldKit account</h1>
        </CardTitle>
        <CardDescription>
          Keep your notes, tasks, and plans in one place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm configured={Boolean(getSupabaseConfig())} />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            prefetch={false}
            className="underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegistrationPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10">
      <Suspense fallback={<output>Loading registration…</output>}>
        <RegistrationContent />
      </Suspense>
    </main>
  );
}
