"use client";

import { useContext } from "react";
import { FeedbackContext } from "@/components/fieldkit/feedback/workspace-feedback-context";

export function useOptionalWorkspaceFeedback() {
  return useContext(FeedbackContext);
}

export function useWorkspaceFeedback() {
  const context = useOptionalWorkspaceFeedback();
  if (!context) throw new Error("Workspace feedback provider is missing.");
  return context;
}
