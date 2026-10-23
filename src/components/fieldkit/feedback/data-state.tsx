"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AppLoading } from "../layout/app-loading";

export function DataState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  if (!error) return <AppLoading />;
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Unable to load your notes and tasks</AlertTitle>
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
