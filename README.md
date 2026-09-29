This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This project uses pnpm 10.15.0, pinned in `package.json`. If pnpm is not installed, install the pinned version with `npm install --global pnpm@10.15.0`.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
