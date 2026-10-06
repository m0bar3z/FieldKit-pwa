# Authentication and access control

FieldKit uses Supabase email/password sign-in and server-managed, HTTP-only
session cookies. Existing users can sign in at `/login` and sign out from the
workspace header. Registration and password recovery are separate features.
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
4. Enable the email/password provider in Supabase Authentication. For testing,
   create an email/password user through Authentication → Users → Add user.
   Confirm the account before attempting sign-in.
5. Restart Next.js after adding environment variables.

Never put a service-role/secret key or database password in `NEXT_PUBLIC_` values.
Supabase provides password authentication rate limiting; no custom auth provider
or public registration endpoint is added here.

## Boundaries

- Proxy verifies users and refreshes cookies for workspace/login requests. Its
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
