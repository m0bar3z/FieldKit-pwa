"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WorkspaceLoading } from "../layout/workspace-loading";

export function WorkspaceDataState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  if (!error) return <WorkspaceLoading />;
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Unable to load your workspace</AlertTitle>
      <AlertDescription>
        <p>{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={retry}
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
