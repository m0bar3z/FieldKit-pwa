# FieldKit

FieldKit is a learning project for building and showcasing Progressive Web App
(PWA) capabilities with Next.js. The goal is a simple offline-first **Field Notes
& Tasks** app: a lightweight combination of notes and a todo list, useful even
with an unreliable connection.

The product stays small so the focus can be on browser APIs, local data storage,
service workers, and the experience of using a web app like an installed app.

## Current progress

FieldKit is in early development. The current home page contains the push
notification controls and installation instructions; the notes and tasks app
has not been built yet.

| Capability | Status |
| --- | --- |
| Web app manifest | Implemented, with standalone display and 192px / 512px icons |
| Push notification UI | Connected to the home page: subscribe, unsubscribe, and send a test message |
| Push delivery | Prototype: Server Actions and service worker event handlers are present; device testing remains |
| Installation guidance | iOS instructions and standalone-mode detection are present; the installation button has no handler |
| Notes and tasks | Planned |
| Offline storage and cached app shell | Planned; the current service worker only handles notifications |
| Background sync | Planned |

### Prototype limitations

- Push subscriptions are held in one server-side variable. They are lost on
  server restarts and are not shared reliably across serverless instances or
  users. Persistent storage is needed before reliable Vercel testing.
- The `VAPID_SUBJECT` environment variable needs a real `mailto:` contact address.
- Notification payloads reference `/icon.png` and `/badge.png`, which are not
  supplied yet. The manifest icons are separate assets.
- End-to-end push delivery, installation, and cross-device behavior still need
  verification. The app does not currently work offline.

## Learning roadmap

- [ ] Create, edit, and delete field notes.
- [ ] Create tasks and mark them complete.
- [ ] Persist notes and tasks locally using IndexedDB.
- [ ] Cache the app shell and support opening the app offline.
- [ ] Handle service worker updates and cache versioning.
- [ ] Store push subscriptions persistently and verify notification delivery.
- [ ] Explore background sync for changes made offline.
- [ ] Test installation and behavior on mobile and desktop browsers.

These are learning goals, not claims of existing functionality. Background sync
and other optional capabilities should have fallbacks where unsupported.

## Tech stack

- Next.js 16.3.8 with the App Router and Server Actions
- React 19 and TypeScript
- Tailwind CSS 4
- Web Push API and `web-push`
- Biome for linting and formatting
- pnpm, Husky, lint-staged, and commitlint

## Run locally

Use Node.js **22.12.0 or newer** and **pnpm 10.15.0**, the version pinned in
`package.json`.

Install dependencies and generate VAPID keys for the push prototype:

```bash
pnpm install
pnpm exec web-push generate-vapid-keys
```

Create `.env.local` in the project root using the generated values:

```dotenv
VAPID_SUBJECT=mailto:you@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

Set `VAPID_SUBJECT` to your real contact email, including the `mailto:` prefix
and without angle brackets. It is a server-only setting. Keep the private key
server-side too. Environment files are ignored by Git.

Start the development server:

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

## Test on a phone

Open the app through a trusted HTTPS URL, such as an HTTPS tunnel or deployment.
An HTTP LAN address such as `http://192.168.x.x:3000` is not a secure origin for
push notification testing.

Next.js also supports HTTPS during development:

```bash
pnpm dev --experimental-https
```

For LAN access, the certificate must cover the address being used and be trusted
by the phone. Simply bypassing a certificate warning is not sufficient.

Once the push prototype limitations are resolved, tap **Subscribe**, allow
notifications, enter a message, and tap **Send Test**. Check both the site's
notification permission and the browser's notification settings on the phone.

When deploying to Vercel, configure all three VAPID variables for the deployment
environment before building. Local `.env.local` values do not transfer
automatically. Use persistent subscription storage rather than the current
in-memory variable.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Check linting, formatting, and imports |
| `pnpm lint:fix` | Apply safe Biome fixes |
| `pnpm format` | Format supported files |
| `pnpm typecheck` | Generate route types and check TypeScript |
| `pnpm check` | Run lint and TypeScript checks |
| `pnpm test:tooling` | Test Git workflow tooling, not app behavior |

Use `pnpm add` for dependencies and commit the lockfile when dependencies change.
The project enables strict TypeScript, typed routes, and Cache Components.
VS Code recommendations and settings are provided for TypeScript, Tailwind CSS,
Biome, and EditorConfig.

Git hooks run Biome on staged files, validate Conventional Commits, and check
branch names and TypeScript before pushes. Use branch names such as
`feat/offline-notes` and commit messages such as `feat(notes): add local storage`.
The `.github/` directory is currently ignored, so the local CI templates are not
included in repository clones.

## Project structure

```text
src/
  app/
    page.tsx                     # Home page with PWA controls
    layout.tsx                   # Root layout
    manifest.ts                  # Web app manifest
  components/
    PushNotificationManager.tsx  # Subscription and test notification UI
    InstallPrompt.tsx            # Installation guidance
  lib/
    service-worker.js            # Push and notification-click handlers
  actions.ts                     # Push subscription and delivery prototype
  utils.ts                       # VAPID public key conversion
public/                          # Manifest icons and static assets
```

## References

- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Chrome PWA install requirements](https://web.dev/articles/install-criteria)
- [Next.js HTTPS development options](https://nextjs.org/docs/app/api-reference/cli/next#using-https-during-development)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)

## License

Licensed under the [MIT License](LICENSE).
