"use client";

import { createContext } from "react";

export type FormStatus = { dirty: boolean; pending: boolean };
export type Notice = { id: number; message: string; kind: "success" | "info" };
export const FeedbackContext = createContext<{
  setGuard: (id: string, status: FormStatus | null) => void;
  hasBlockingChanges: () => boolean;
  requestLeave: (leave: () => void) => void;
  notify: (message: string) => void;
  notice: Notice | null;
  dismiss: () => void;
} | null>(null);
