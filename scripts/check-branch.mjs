import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  commitTypes,
  isConventionalBranch,
  pushedBranches,
} from "./git-conventions.mjs";

try {
  const args = process.argv.slice(2);
  let branches;
  if (args[0] === "--pre-push") {
    branches = pushedBranches(readFileSync(0, "utf8"));
  } else if (args.length > 0) {
    branches = args;
  } else if (process.env.BRANCH_NAME) {
    branches = [process.env.BRANCH_NAME];
  } else {
    branches = [
      execFileSync("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    ];
  }
  for (const branch of branches) {
    // Check the full ref to avoid Git's special @{-n} branch expansion.
    execFileSync("git", ["check-ref-format", `refs/heads/${branch}`], {
      stdio: "pipe",
    });
    if (!isConventionalBranch(branch)) {
      throw new Error(
        `Invalid branch name: ${JSON.stringify(branch)}. Use <type>/<kebab-case-description>. Types: ${commitTypes.join(", ")}. Examples: feat/email-login, fix/123-mobile-menu. Exceptions: main, renovate/*, dependabot/*.`,
      );
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(
    "Check the branch name, or pass it explicitly when HEAD is detached.",
  );
  process.exitCode = 1;
}
