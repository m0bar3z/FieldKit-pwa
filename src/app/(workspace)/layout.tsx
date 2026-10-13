import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { WorkspaceFeedbackProvider } from "@/components/fieldkit/feedback/workspace-feedback-provider";
import { AppShell } from "@/components/fieldkit/layout/app-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceFeedbackProvider>
      <AppShell accountActions={<SignOutButton />}>{children}</AppShell>
    </WorkspaceFeedbackProvider>
  );
}
