"use client";

import { RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ServiceWorkerUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const serviceWorkers = navigator.serviceWorker;
    let previousController = serviceWorkers.controller;

    const handleControllerChange = () => {
      const controller = serviceWorkers.controller;
      const isUpdate =
        previousController !== null &&
        controller !== null &&
        previousController !== controller;

      previousController = controller;
      if (!isUpdate) return;

      setUpdateAvailable(true);
    };

    serviceWorkers.addEventListener("controllerchange", handleControllerChange);
    return () => {
      serviceWorkers.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  if (!updateAvailable) return null;

  function reload() {
    window.location.reload();
  }

  return (
    <Alert role="status" aria-live="polite" aria-atomic="true">
      <RefreshCwIcon aria-hidden="true" />
      <AlertTitle>A new version of FieldKit is ready</AlertTitle>
      <AlertDescription>
        <p>
          Reload when you're ready to use the latest version. Save your changes
          first.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" onClick={reload}>
            <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
            Reload
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setUpdateAvailable(false)}
          >
            Later
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
