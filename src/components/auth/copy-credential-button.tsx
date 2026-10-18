"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyCredentialButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timeout = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Copy ${label}`}
        title={status === "copied" ? "Copied!" : `Copy ${label}`}
        onClick={copy}
      >
        {status === "copied" ? (
          <CheckIcon aria-hidden="true" data-icon="inline-end" />
        ) : (
          <CopyIcon aria-hidden="true" data-icon="inline-end" />
        )}
      </Button>
      <output className="sr-only">
        {status === "copied" && `${label} copied.`}
        {status === "error" &&
          `Unable to copy ${label}. Please copy it manually.`}
      </output>
    </>
  );
}
