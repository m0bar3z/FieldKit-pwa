# Authentication and access control

FieldKit uses Supabase email/password sign-in and server-managed, HTTP-only
session cookies. Existing users can sign in at `/login` and sign out from the
workspace header. New users can register with email and password at `/register`.
Password recovery remains a separate feature.
Product pages read owned records and use authenticated actions for writes.

## Supabase setup

1. Open your Supabase project → Connect → Frameworks → Next.js.
2. Copy the Project URL and **publishable** key into `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. Apply all numbered Drizzle migrations in order. The authentication migrations
   add the user identity mapping, owner policies, and table permissions; they do
   not create or alter Supabase's `auth.users` table.
4. Enable the email/password provider and allow new sign-ups in Supabase
   Authentication. The registration form requires a password of at least eight
   characters; Supabase also enforces your project's password policy.
5. Under Authentication → URL Configuration, set the Site URL to your app URL
   and add `http://localhost:3000/auth/callback` to Redirect URLs for development.
   Add `https://your-domain/auth/callback` for deployment, and the callback URL
   for any LAN address you use on your phone. Keep the confirmation email's
   default `{{ .ConfirmationURL }}` link so Supabase verifies it before redirecting.
6. With email confirmation enabled, registration displays a check-email message.
   Open the link in the same browser where you registered; `/auth/callback`
   exchanges the PKCE code (and optional flow ID) for a verified cookie session.
   If opened in another browser or the link expires, use `/login` after confirming
   your email. With confirmation disabled, registration signs the user in directly.
7. Supabase's default email sender only delivers to organization team addresses.
   Use your team email for testing, or configure custom SMTP for other addresses.
   See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
8. Restart Next.js after adding environment variables.

Never put a service-role/secret key or database password in `NEXT_PUBLIC_` values.
Supabase provides authentication rate limiting; registration uses its normal
`signUp` API through a Server Action, with no admin/service-role access.

## Boundaries

- Proxy verifies users and refreshes cookies for workspace/login/register requests. Its
  responses use `private, no-store` and preserve refresh cookies on redirects.
- Each product page verifies authentication independently through its own boundary.
  Session results are only deduplicated within a render, never shared in a cache.
- Server actions validate inputs and verify the current user. The existing push
  prototype keeps subscriptions in memory but separates them by verified user ID.
  It is still a prototype; persistent subscriptions and reminder delivery remain
  separate features.
- `withUserDatabase` derives identity from verified cookies, resolves an integer
  owner ID, and runs product queries under RLS. Callers cannot supply an identity.
  Claims and database role are transaction-local, including when an operation
  fails, to avoid leaking a user's identity through a pooled connection.
- `users` permits authenticated users to read their own mapping only. Product
  policies enforce ownership for SELECT, INSERT, UPDATE, and DELETE. Anonymous
  callers have no table privileges. Supabase metadata is not used for permissions.

The auth UI can run before product migrations are applied, but operations through
`withUserDatabase` require the migrations. An administrator may map an existing
legacy user explicitly; FieldKit never guesses ownership from an email address.
