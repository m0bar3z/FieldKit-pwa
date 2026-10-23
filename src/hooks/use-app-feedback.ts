"use client";

import { useContext } from "react";
import { FeedbackContext } from "@/components/fieldkit/feedback/app-feedback-context";

export function useAppFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("App feedback provider is missing.");
  return context;
}
