import { existsSync } from "node:fs";

if (
  process.env.HUSKY !== "0" &&
  !process.env.CI &&
  process.env.NODE_ENV !== "production" &&
  existsSync(".git")
) {
  const { default: husky } = await import("husky");
  const error = husky();
  if (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
