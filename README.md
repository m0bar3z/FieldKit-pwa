This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 22.12.0 or newer. This project uses pnpm 10.15.0, pinned in `package.json`. If pnpm is not installed, install the pinned version with `npm install --global pnpm@10.15.0`.

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Use `pnpm add <package>` for dependencies and `pnpm add -D <package>` for development dependencies. Run `pnpm lint` to check code and `pnpm build` to create a production build. In CI, use `pnpm install --frozen-lockfile`.

Commit `pnpm-lock.yaml` when dependencies change.

## Code quality and VS Code

[Biome](https://biomejs.dev/) handles linting, formatting, and import organization using the version pinned in `package.json`. Install the recommended **Biome** extension (`biomejs.biome`) when VS Code prompts you, then open this repository as a workspace.

Saving with Ctrl+S / Cmd+S formats JavaScript, TypeScript, JSX, TSX, JSON, JSONC, and CSS, applies safe lint fixes, and organizes imports. Remaining lint errors appear in the Problems panel. Save actions use `explicit`, so automatic saves do not trigger the lint fixes or import organization. Files still need to be saved manually for those actions.

The configuration uses Biome's recommended rules plus the Next.js and React domains, including accessibility checks. Unused imports, variables and parameters, explicit `any`, non-null assertions, incorrect hook dependencies, array-index keys, async client components, and plain `<img>` elements are errors. Use `_`-prefixed parameters when an unused parameter is required by an API. `console.warn` and `console.error` are allowed; other console calls and `debugger` are errors.

Formatting uses two spaces, double quotes, semicolons, trailing commas, LF line endings, and an 80-column target. Tailwind CSS directives are supported. Generated files, dependencies, build output, and coverage are excluded. Experimental nursery rules are not enabled by default.

| Command | Purpose |
| --- | --- |
| `pnpm lint` | Check lint rules, formatting, and import organization; fail on warnings too. |
| `pnpm lint:fix` | Apply safe fixes, formatting, and import organization; report anything remaining. |
| `pnpm lint:ci` | Run the same checks in CI without writing files. |
| `pnpm format` | Format supported files. |
| `pnpm format:check` | Check formatting without writing files. |
| `pnpm typecheck` | Generate Next.js route types, then run TypeScript without emitting files. |
| `pnpm check` | Run lint, formatting, import, and TypeScript checks. |

Automatic fixes are limited to Biome's safe fixes. Review other suggestions individually through Quick Fix; no unsafe fixes run on save. Biome is not a replacement for the TypeScript compiler or every rule in Next.js's ESLint plugin. Run `pnpm check` before committing: Next.js builds do not run linting automatically.

## Git workflow

`pnpm install` installs the repository's Husky hooks through `prepare`. Installation skips hooks in CI, production-only installs, and copies without Git metadata. After running `git init` in a downloaded template, run `pnpm prepare`.

| Hook | Behavior |
| --- | --- |
| `pre-commit` | Run lint-staged with Biome on staged JS, TS, JSON, JSONC, and CSS files. Apply safe fixes and block remaining errors or warnings. |
| `commit-msg` | Validate the commit message with commitlint. |
| `pre-push` | Validate all source and destination branch refs being pushed, then run TypeScript checks. Tags and branch deletions are exempt from naming validation. |

lint-staged preserves unstaged changes in partially staged files and stages its fixes automatically. It passes explicit filenames to Biome; it does not call the whole-project `lint:fix` script. The pinned lint-staged 16.1.6 supports Node 22.12.0; newer major versions require a newer Node patch release.

Use Conventional Commits:

```text
feat(auth): add email login
fix(ui): prevent navigation overflow
chore(tooling): configure biome
feat!: change configuration API
```

Types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`. Types must be lowercase. Scope is optional and unrestricted. The description must be nonempty with no trailing period, and the complete header must be at most 100 characters. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer. `style` means code formatting. Automatic message exemptions are disabled, so PR titles such as “Merge pull request” cannot bypass validation.

Use `<type>/<kebab-case-description>` for branches, such as `feat/email-login`, `fix/123-mobile-menu`, or `chore/biome-setup`. The type list is shared with commitlint in `scripts/git-conventions.mjs`. Issue numbers are optional. `main`, `renovate/*`, and `dependabot/*` are exempt from the naming pattern but must still be valid Git refs.

```bash
pnpm branch:check                       # Check the current branch
pnpm branch:check feat/email-login      # Check an explicit name
pnpm test:tooling                       # Test commit and branch validation
```

The push hook checks only the branch refs in the actual push and the application’s TypeScript types. Run `pnpm test:tooling` when changing the Git hooks or validation rules; the validator’s example cases do not run on every push.

The CI workflow runs on pull requests (including title edits), pushes to `main`, and manual dispatch. Its **Quality** job validates the branch and PR title, checks lint/formatting/imports and TypeScript, runs Git workflow tests, and builds the app. PR titles use the same rules as commit messages. CI validates PR titles rather than every intermediate commit because this repository uses squash merging.

The workflow runs untrusted PR code with read-only permissions, no persisted checkout credentials, and no repository secrets. It installs the pnpm version from `package.json` with the frozen lockfile. Build steps using `next/font/google` require access to Google's font servers.

### GitHub repository settings

The `.github/` directory is currently ignored by Git. Its workflow and settings files exist only locally and are not included in these commits or template clones. CI will run only after the workflow is explicitly added to a repository.

`.github/repository-settings.json` describes squash-only merging with the PR title as the commit title and PR body as the commit body. `.github/main-protection.json` describes protection for `main`: require the **Quality** check and an up-to-date branch, require a PR with zero reviewer approvals, enforce the rules for admins, and block force pushes and deletion.

These JSON files are templates, not settings GitHub applies automatically. After pushing the workflow and completing its first successful run, apply settings to a new template-derived repository with:

```bash
gh api --method PATCH 'repos/{owner}/{repo}' --input .github/repository-settings.json
gh api --method PUT 'repos/{owner}/{repo}/branches/main/protection' --input .github/main-protection.json
```

GitHub currently returns HTTP 403 for branch protection on this private starter repository because the account needs GitHub Pro or a supported organization plan. CI and local hooks still work, but passing checks cannot be required by GitHub until that restriction is resolved. Repository visibility is unchanged.

Local hooks can be bypassed; required CI checks enforce the merge policy when protection is available. Repository settings are configured separately for each project created from this starter. Git GUI users using nvm may need to initialize nvm in `~/.config/husky/init.sh` so hooks can find Node and pnpm.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
