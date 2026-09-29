export const commitTypes = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

const branchPattern = new RegExp(
  `^(${commitTypes.join("|")})/[a-z0-9]+(?:-[a-z0-9]+)*$`,
);

export function isConventionalBranch(name) {
  return (
    name === "main" ||
    branchPattern.test(name) ||
    /^(renovate|dependabot)\/.+/.test(name)
  );
}

export function pushedBranches(input) {
  const names = new Set();
  for (const line of input.trim().split("\n").filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4) throw new Error("Invalid Git pre-push input.");
    const [localRef, localSha, remoteRef] = fields;
    if (/^0+$/.test(localSha) || !remoteRef.startsWith("refs/heads/")) continue;
    names.add(remoteRef.slice("refs/heads/".length));
    if (localRef.startsWith("refs/heads/")) {
      names.add(localRef.slice("refs/heads/".length));
    }
  }
  return [...names];
}
