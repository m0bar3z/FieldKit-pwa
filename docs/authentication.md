# Demo authentication

This branch has one hardcoded demo account:

- Email: `demo@fieldkit.app`
- Password: `FieldKit123!`

Open `/login` and use these credentials. The values are defined in
`src/lib/auth/demo-account.ts` and shown on the login page. Registration, email
confirmation, password recovery, and Supabase authentication have been removed.
No authentication environment variables or external services are required.

`POST /api/auth/login` validates email/password and creates a random, opaque token.
The token is stored in the server's session array and an HttpOnly, SameSite=Lax
cookie. The cookie uses Secure in production and expires after seven days.
`GET /api/auth/session` returns the current demo user; `DELETE /api/auth/session`
revokes the token and clears the cookie. Login rotates the current browser session.
Passwords and tokens are not returned by the session endpoint.

Each workspace page verifies its session, and every data API independently rejects
unauthenticated requests with HTTP 401. Mutating endpoints reject cross-origin
browser requests. Auth/API responses use `private, no-store`. Proxy only sets page
cache headers; it does not access the process-local session array.

All sessions belong to the same demo workspace. The credentials are intentionally
public and are for PWA learning, not production account security. Session/data
arrays survive ordinary requests within one Node.js process, but reset on restart
and are not shared across workers or serverless instances. A restart requires
signing in again. Keep Supabase/database credentials out of this branch's setup.
