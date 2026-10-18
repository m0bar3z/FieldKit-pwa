import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CopyCredentialButton } from "@/components/auth/copy-credential-button";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { safeReturnPath } from "@/lib/auth/input";
import { getCurrentUser } from "@/lib/auth/session";

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
          Use the demo account to open your notes and tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm next={next} />
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Email: <code>{DEMO_ACCOUNT.email}</code>
          <CopyCredentialButton label="email" value={DEMO_ACCOUNT.email} />
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Password: <code>{DEMO_ACCOUNT.password}</code>
          <CopyCredentialButton
            label="password"
            value={DEMO_ACCOUNT.password}
          />
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
