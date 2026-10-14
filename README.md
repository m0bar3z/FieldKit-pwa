# FieldKit

FieldKit is a PWA learning project: a simple personal workspace for **Notes +
Tasks**, built with Next.js, React, Tailwind CSS, and shadcn/ui.

This branch uses a small demo backend so development can focus on PWA features.
Next.js API routes store tasks, notes, attachments, and sessions in server-side
arrays. Supabase, Drizzle, PostgreSQL, registration, and migrations are removed.

## Run locally

Use Node.js **22.12.0 or newer** and **pnpm 10.15.0**.

```bash
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000), then sign in with:

- Email: `demo@fieldkit.app`
- Password: `FieldKit123!`

No database or authentication environment variables are needed. These public demo
credentials are defined in `src/lib/auth/demo-account.ts`.

## Current features

- Create, edit, complete, and delete tasks.
- Create, edit, search, and delete notes.
- Search/filter tasks and show dashboard counts and due dates in the local time zone.
- Upload, download, and remove small attachments.
- Demo login/logout with an opaque HttpOnly session cookie.
- Loading, error, retry, empty, and success feedback.
- Web app manifest/icons, Serwist registration/caching and offline fallback,
  online/offline indicators, update prompts, and installation guidance.

IndexedDB persistence, offline product editing, drafts, cloud synchronization,
and reminder delivery are future learning tasks. API reads alone do not provide
an offline-editable database.

## Demo backend limitations

The arrays are held in one Node.js process. **Restarting the server clears data,
files, and sessions.** All demo-account sessions share one workspace; different
processes or serverless instances have independent arrays. Use one local server
for predictable behavior. This branch demonstrates PWA development rather than
production account security or durable cloud storage.

The previous cloud backend remains available in the main branch history.

## API and implementation

- [Demo authentication](docs/authentication.md)
- [Product API](docs/product-actions.md)
- [Attachments](docs/attachments.md)

```text
src/app/api/auth/                # Login and session/logout handlers
src/app/api/workspace/           # UI data and dashboard counts
src/app/api/tasks/               # Task CRUD and completion
src/app/api/notes/               # Note CRUD
src/app/api/attachments/         # File upload/download/removal
src/lib/memory/                  # Process-local arrays and record types
src/lib/auth/                    # Hardcoded account and session helpers
src/lib/api/                     # HTTP client, server helpers, and errors
src/lib/products/                # Validation, array operations, and UI formatting
src/components/fieldkit/pages/   # Pages that fetch data through the API
src/components/fieldkit/pwa/     # Installation, connection, and update UI
src/app/sw.ts                   # Serwist worker configuration
```

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm lint` | Biome checks |
| `pnpm lint:fix` | Safe Biome fixes |
| `pnpm typecheck` | Next.js route types and TypeScript checks |
| `pnpm test:auth` | Login input validation checks |
| `pnpm test:tooling` | Git workflow checks |

For phone testing, use a trusted HTTPS deployment/tunnel or a certificate trusted
by the phone. HTTP LAN addresses are not secure origins for service workers.
Git hooks run Biome and enforce Conventional Commits; use branch names such as
`refactor/simplify-backend` and messages such as `feat(pwa): add local drafts`.

## License

[MIT](LICENSE).
