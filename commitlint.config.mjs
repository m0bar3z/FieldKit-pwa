import { commitTypes } from "./scripts/git-conventions.mjs";

export default {
  extends: ["@commitlint/config-conventional"],
  defaultIgnores: false,
  rules: {
    "type-enum": [2, "always", commitTypes],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-case": [0],
    "scope-case": [0],
    "header-max-length": [2, "always", 100],
    "breaking-change-exclamation-mark": [0],
  },
};
