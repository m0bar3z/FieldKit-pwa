# Product schema

Generate future migrations with `pnpm exec drizzle-kit generate --name=<change>`.
The config only generates SQL; it does not connect to Supabase. Apply the numbered
migrations in order using a PostgreSQL migration runner. Do not use `push` as a
replacement: the metadata triggers live in the custom SQL migration.

The baseline preserves an existing starter `users` table, which must match
`src/lib/schema.ts`. It can also create that table on a fresh database.

| Table | Parent | Product fields |
| --- | --- | --- |
| projects | existing user | name, description, category |
| tasks | project with the same owner | title, description, completed, due date |
| notes | project with the same owner | title, plain-text content |
| attachments | exactly one task or note with the same owner | filename, MIME type, byte size, optional storage object key |
| reminders | task with the same owner | reminder instant, optional sent instant |

Each new table has a UUID `id`, required `owner_id`, timezone-aware `created_at`
and `updated_at`, nullable `deleted_at`, and a positive `version` starting at 1.
Clients may supply UUIDs; PostgreSQL generates them when omitted. An UPDATE
trigger stamps `updated_at`, increments `version`, and prevents identity,
ownership, or creation-time changes. Future optimistic updates can match both
`id` and the previously read `version`; a stale version then updates no rows.

Foreign keys reject missing parents and mixed ownership. Hard deletion of a
parent with children is restricted. Future deletion actions should set
`deleted_at`, including related items as appropriate, and retain these tombstones
until synchronization permits cleanup. The schema does not implement deletion
actions, conflict handling, or synchronization.

Due dates are calendar dates. Reminder timestamps represent instants, so callers
must convert the user's local time to an offset/UTC before saving. Attachments
store metadata rather than blobs; `storage_key` can remain null until upload.

RLS is enabled on the product tables and `users`. `users.auth_id` maps the existing
integer owner IDs to Supabase Auth UUIDs. Legacy users remain unmapped and cannot
be accessed by clients until an administrator explicitly associates an identity.
`withUserDatabase` creates a mapping for a verified identity when first used;
clients cannot insert, change, or delete mappings. Each product policy permits
only the mapped owner's rows. UPDATE checks both the existing and proposed owner.

Future server product operations must use `src/lib/access.ts`'s
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
