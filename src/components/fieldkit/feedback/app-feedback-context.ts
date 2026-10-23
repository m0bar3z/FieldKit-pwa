"use client";

import { createContext } from "react";

export type Notice = { id: number; message: string; kind: "success" | "info" };
export const FeedbackContext = createContext<{
  notify: (message: string) => void;
  notice: Notice | null;
  dismiss: () => void;
} | null>(null);
