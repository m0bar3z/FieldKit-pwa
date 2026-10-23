import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppFeedbackProvider } from "@/components/fieldkit/feedback/app-feedback-provider";
import { AppShell } from "@/components/fieldkit/layout/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppFeedbackProvider>
      <AppShell accountActions={<SignOutButton />}>{children}</AppShell>
    </AppFeedbackProvider>
  );
}
