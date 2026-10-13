"use client";

import { useContext } from "react";
import { FormContext } from "@/components/fieldkit/forms/product-form-context";

export function useProductForm() {
  return useContext(FormContext);
}
