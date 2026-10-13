"use client";

import { createContext } from "react";
export const FormContext = createContext<{
  pending: boolean;
  pendingLabel: string;
}>({ pending: false, pendingLabel: "Saving…" });
