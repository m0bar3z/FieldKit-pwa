"use client";

import { createContext } from "react";
import type { ProductActionState } from "@/lib/products/input";

export type ProductAction = (
  state: ProductActionState,
  form: FormData,
) => Promise<ProductActionState>;
export const FormContext = createContext<{
  state: ProductActionState;
  pending: boolean;
  pendingLabel: string;
}>({ state: {}, pending: false, pendingLabel: "Saving…" });
