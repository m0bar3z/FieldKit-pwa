import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { pushedBranches } from "./git-conventions.mjs";

const commitlintPackage = JSON.parse(
  readFileSync("node_modules/@commitlint/cli/package.json", "utf8"),
);
const commitlint = resolve(
  "node_modules/@commitlint/cli",
  commitlintPackage.bin.commitlint,
);

function branchCheck(args, input) {
  return spawnSync(process.execPath, ["scripts/check-branch.mjs", ...args], {
    encoding: "utf8",
    input,
    env: { ...process.env, BRANCH_NAME: "" },
  });
}

for (const name of [
  "main",
  "feat/email-login",
  "fix/123-mobile-menu",
  "ci/add-checks",
  "renovate/react-19.x",
  "dependabot/npm_and_yarn/next-16.3.7",
]) {
  test(`accepts branch ${name}`, () => {
    const result = branchCheck([name]);
    assert.equal(result.status, 0, result.stderr);
  });
}

for (const name of [
  "feature/login",
  "feat/Login",
  "fix/two--hyphens",
  "chore/",
  "feat/nested/name",
  "feat/has space",
  "dependabot/bad..ref",
  "renovate/",
  "main-extra",
]) {
  test(`rejects branch ${name}`, () => {
    const result = branchCheck([name]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /branch name/i);
  });
}

test("pre-push validates source and destination branches across multiple refs", () => {
  const input =
    "refs/heads/feat/login abc refs/heads/feat/login def\nHEAD abc refs/heads/invalid def\n";
  assert.deepEqual(pushedBranches(input), ["feat/login", "invalid"]);
  const result = branchCheck(["--pre-push"], input);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid/);
  assert.equal(
    branchCheck(
      ["--pre-push"],
      "refs/heads/invalid abc refs/heads/feat/login def\n",
    ).status,
    1,
  );
});

test("pre-push permits detached HEAD to a valid destination, tags, and deletions", () => {
  const input =
    "HEAD abc refs/heads/fix/login def\n(delete) 000000 refs/heads/old-invalid-name abc\nrefs/tags/v1.0.0 abc refs/tags/v1.0.0 000000\n";
  assert.deepEqual(pushedBranches(input), ["fix/login"]);
  assert.equal(branchCheck(["--pre-push"], input).status, 0);
  assert.equal(branchCheck(["--pre-push"], "").status, 0);
});

test("pre-push rejects malformed input", () => {
  assert.equal(branchCheck(["--pre-push"], "bad input").status, 1);
});

for (const message of [
  "feat(auth): add email login",
  "fix: prevent overflow",
  "chore(Tooling): configure biome",
  "feat!: change configuration API",
  "feat: change configuration API\n\nBREAKING CHANGE: configuration requires a site URL",
  `docs: ${"a".repeat(94)}`,
]) {
  test(`accepts commit ${message.split("\n")[0]}`, () => {
    const result = spawnSync(process.execPath, [commitlint, "--strict"], {
      input: message,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}

for (const message of [
  "update stuff",
  "Feat: add login",
  "feature: add login",
  "fix:",
  "fix: prevent overflow.",
  `docs: ${"a".repeat(95)}`,
  "Merge pull request #1",
]) {
  test(`rejects commit ${message}`, () => {
    const result = spawnSync(process.execPath, [commitlint, "--strict"], {
      input: message,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /found .*problems/);
  });
}
