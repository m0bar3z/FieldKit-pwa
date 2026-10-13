import type { z } from "zod";

export function validationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.join(".") || "root.server";
    fields[name] ??= issue.message;
  }
  return fields;
}
