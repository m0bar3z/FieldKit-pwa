"use client";

import { useContext } from "react";
import { FeedbackContext } from "@/components/fieldkit/feedback/workspace-feedback-context";

export function useWorkspaceFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("Workspace feedback provider is missing.");
  return context;
}
