# Demo authentication

This branch has two hardcoded demo accounts, each with its own notes and tasks:

- Email: `demo@fieldkit.app`
- Second account: `second@fieldkit.app`
- Password: `FieldKit123!`

Open `/login` and use these credentials. The values are defined in
`src/lib/auth/demo-account.ts` and shown on the login page. Registration, email
confirmation, password recovery, and Supabase authentication have been removed.
No external authentication service is required. A server-only signing secret is
required: generate one with `openssl rand -base64 32` and set `SESSION_SECRET` in
`.env.local` (see `.env.example`). Keep this value out of Git and never prefix it
with `NEXT_PUBLIC_`.

On Vercel, add `SESSION_SECRET` in the project's environment variables for each
deployment environment you use, then redeploy. All function instances in an
environment must use the same value. Local `.env.local` values are not uploaded
automatically.

`POST /api/auth/login` validates email/password and creates an HS256-signed JWT
using `jose`. The cookie contains the account ID, issuer, audience, issue time,
expiration, and a random session ID. Verification checks the signature, required
claims, expiration, and known demo account without looking up process memory.
The HttpOnly, SameSite=Lax cookie uses Secure in production and expires after
seven days. Independent Vercel functions can verify it using `SESSION_SECRET`.
`GET /api/auth/session` returns the current signed-in user; `DELETE /api/auth/session`
clears the browser cookie. Login issues a fresh token. Stateless tokens remain
valid until expiration; rotating the secret invalidates all existing tokens.
Old opaque cookies from the previous implementation require signing in again.
Passwords and tokens are not returned by the session endpoint.

Each app page verifies its session, and every data API independently rejects
unauthenticated requests with HTTP 401. Mutating endpoints reject cross-origin
browser requests. Auth/API responses use `private, no-store`. Proxy only sets page
cache headers; authentication is checked by pages and APIs.

Session tokens identify a specific account. Tasks, notes, attachments, local note
edits, and cached API responses are scoped to that owner. Every data API checks
record ownership and returns 404 for items belonging to another account.
Signing in or out clears private runtime caches and reloads other open tabs.
Existing demo data is assigned to the original demo account. The credentials are intentionally
public and are for PWA learning, not production account security. Sessions survive
restarts and separate function instances while the signing secret stays the same.
Task, note, and attachment arrays still reset on restart and are not shared
across serverless instances; they need shared storage for reliable hosted data.
