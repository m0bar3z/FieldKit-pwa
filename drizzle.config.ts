import { defineConfig } from "drizzle-kit";

// Generating migrations does not need credentials or connect to Supabase.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
});
