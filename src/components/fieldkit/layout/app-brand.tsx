"use client";

import { NotebookPenIcon } from "lucide-react";
import { AppLink as Link } from "../navigation/app-link";

export function AppBrand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <NotebookPenIcon className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        FieldKit<span className="text-muted-foreground">.</span>
      </span>
    </Link>
  );
}
