"use client";

import { CheckCircle2Icon, InfoIcon, XIcon } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useWorkspaceFeedback } from "@/hooks/use-workspace-feedback";

export function WorkspaceFeedback() {
  const { notice, dismiss } = useWorkspaceFeedback();
  if (!notice) return null;
  return (
    <Alert key={notice.id}>
      {notice.kind === "success" ? <CheckCircle2Icon /> : <InfoIcon />}
      <AlertTitle>
        {notice.kind === "success" ? "Done" : "Please wait"}
      </AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss message"
          onClick={dismiss}
        >
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  );
}
