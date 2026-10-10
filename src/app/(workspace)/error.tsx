"use client";

import { useTransition } from "react";
import { LinkButton } from "@/components/fieldkit/link-button";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

export default function WorkspaceError({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Unable to load your workspace</EmptyTitle>
        <EmptyDescription>Please try again in a moment.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button disabled={pending} onClick={() => startTransition(retry)}>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Trying again…" : "Try again"}
        </Button>
        <LinkButton href="/" variant="outline">
          Back to workspace
        </LinkButton>
      </EmptyContent>
    </Empty>
  );
}
