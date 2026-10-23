# FieldKit

FieldKit is a PWA learning project: a simple personal app for **Notes +
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
- Second account: `second@fieldkit.app`
- Password: `FieldKit123!`

No database or authentication environment variables are needed. These public demo
credentials are defined in `src/lib/auth/demo-account.ts`.

## Current features

- Create, edit, complete, and delete tasks.
- Create, edit, search, and delete notes.
- Search/filter tasks and show dashboard counts and due dates in the local time zone.
- Upload, download, and remove small attachments.
- Demo login/logout with an opaque HttpOnly session cookie.
- Account-owned tasks, notes, attachments, offline edits, and cached API data.
- Loading, error, retry, empty, and success feedback.
- Web app manifest/icons, Serwist registration/caching and offline fallback,
  online/offline indicators, update prompts, and installation guidance.

Edits to existing notes are saved in IndexedDB and synchronized on startup,
reconnection, and after saving while the app is open. Background Sync also runs
through the service worker where supported. The installed app badge shows the
current account's overdue task count where supported. Cached API reads are
overlaid with local edits. Offline-created notes can be read locally; syncing
new notes, offline task changes, unsaved drafts, and reminder delivery remain
future learning tasks.

## Demo backend limitations

The arrays are held in one Node.js process. **Restarting the server clears data,
files, and sessions.** Sessions of the same account share its records; different
accounts have separate records. Different
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
src/app/api/tasks/               # Personal task data, counts, CRUD, and completion
src/app/api/notes/               # Personal note data and CRUD
src/app/api/attachments/         # File upload/download/removal
src/lib/memory/                  # Process-local arrays and record types
src/lib/auth/                    # Demo accounts and account-bound session helpers
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
| `pnpm test:note-sync` | Note edit persistence, retry, and conflict checks |
| `pnpm test:products` | Personal task/note APIs and account isolation checks |
| `pnpm test:tooling` | Git workflow checks |

For phone testing, use a trusted HTTPS deployment/tunnel or a certificate trusted
by the phone. HTTP LAN addresses are not secure origins for service workers.
Git hooks run Biome and enforce Conventional Commits; use branch names such as
`refactor/simplify-backend` and messages such as `feat(pwa): add local drafts`.

## License

[MIT](LICENSE).
