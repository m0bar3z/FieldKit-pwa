# Product schema

Generate future migrations with `pnpm exec drizzle-kit generate --name=<change>`.
The config only generates SQL; it does not connect to Supabase. Apply the numbered
migrations in order using a PostgreSQL migration runner. Do not use `push` as a
replacement: the metadata triggers live in the custom SQL migration.

The baseline preserves an existing starter `users` table, which must match
`src/lib/schema.ts`. It can also create that table on a fresh database.

| Table | Parent | Product fields |
| --- | --- | --- |
| projects (legacy, read-only) | existing user | preserved historical name, description, category |
| tasks | existing user; optional legacy project link | title, description, completed, due date |
| notes | existing user; optional legacy project link | title, plain-text content |
| attachments | exactly one task or note with the same owner | filename, MIME type, byte size, optional storage object key |
| reminders | task with the same owner | reminder instant, optional sent instant |

Each new table has a UUID `id`, required `owner_id`, timezone-aware `created_at`
and `updated_at`, nullable `deleted_at`, and a positive `version` starting at 1.
Clients may supply UUIDs; PostgreSQL generates them when omitted. An UPDATE
trigger stamps `updated_at`, increments `version`, and prevents identity,
ownership, or creation-time changes. Future optimistic updates can match both
`id` and the previously read `version`; a stale version then updates no rows.

Foreign keys reject missing parents and mixed ownership. Hard deletion of a
parent with children is restricted. Core product actions soft-delete a task or
note and its attachment metadata (and task reminders) in one transaction. Deleted
items are hidden from the workspace; tombstones remain until future cleanup.
There is no restore action, file cleanup, conflict resolution, or synchronization.

Due dates are calendar dates. Reminder timestamps represent instants, so callers
must convert the user's local time to an offset/UTC before saving. Attachments
store metadata rather than blobs; `storage_key` can remain null until upload.

Migration `0005_attachment_storage.sql` creates the private Supabase Storage
bucket and its owner access policies, with a 3 MiB limit and a MIME allowlist.
It requires Supabase's existing `storage` schema. Explicit attachment removal
deletes the file through Storage; task/note deletion continues to retain
objects. See `docs/attachments.md` for the upload lifecycle and access rules.

## Personal workspace migration

Apply `0006_personal_workspace.sql` after migrations 0000–0005, using your usual
migration runner, before running the reduced application. This migration is
prepared in the repository; it does not run when Next.js starts.

It allows tasks and notes without a project, removes authenticated project write
policies, and updates the attachment upload policy to require only an active owned
task or note. Existing task/note IDs, contents, versions, and attachment paths are
preserved and appear in the personal workspace. Historical projects and their
links remain in the database for preservation; the app has no project pages or
operations. New items have a null `project_id` and belong directly to their user.

RLS is enabled on the product tables and `users`. `users.auth_id` maps the existing
integer owner IDs to Supabase Auth UUIDs. Legacy users remain unmapped and cannot
be accessed by clients until an administrator explicitly associates an identity.
`withUserDatabase` creates a mapping for a verified identity when first used;
clients cannot insert, change, or delete mappings. Each product policy permits
only the mapped owner's rows. UPDATE checks both the existing and proposed owner.

Server product operations must use `src/lib/access.ts`'s
`withUserDatabase`, which verifies the session and uses a transaction-local
`authenticated` role and JWT claims. Raw privileged queries can bypass RLS and
are reserved for trusted identity provisioning. The application database role
must be allowed to `SET ROLE authenticated` (Supabase's `postgres` role can do so).

## Verification

After applying the migrations to an isolated PostgreSQL test database, run:

```bash
psql "$FIELDKIT_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/tests/product-schema.sql
```

The SQL checks ownership isolation, constraints, relationships, metadata updates,
tombstones, stale-version writes, and denied RLS access. It rolls back test rows
and its temporary test role. Run it only in a disposable test database using a
role allowed to create roles; sequence values may still advance.

Also run `drizzle/tests/owner-access.sql` to test two authenticated owners,
anonymous access, mapping tampering, and transaction-local identity isolation.
