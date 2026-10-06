import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppShell } from "@/components/fieldkit/app-shell";
import { WorkspaceFeedbackProvider } from "@/components/fieldkit/workspace-feedback";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceFeedbackProvider>
      <AppShell accountActions={<SignOutButton />}>{children}</AppShell>
    </WorkspaceFeedbackProvider>
  );
}
