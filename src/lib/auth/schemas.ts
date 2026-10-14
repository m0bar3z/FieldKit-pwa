import { z } from "zod";

const password = z
  .string({ error: "Enter your password." })
  .min(1, "Enter your password.")
  .max(1024, "Enter your password.");
export const signInSchema = z.object({
  email: z
    .string({ error: "Enter a valid email address." })
    .trim()
    .max(254, "Enter a valid email address.")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."),
  // Password whitespace is intentional and must never be normalized.
  password,
});
export type Credentials = z.infer<typeof signInSchema>;
