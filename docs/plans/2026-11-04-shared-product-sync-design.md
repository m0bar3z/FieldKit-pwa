# Shared task and note synchronization

Status: approved by the user and implemented.

Fresh-reader builder check completed: no important unanswered questions.

## Intent and selected approach

Give notes automatic synchronization of offline creation, editing before first
upload, and offline deletion. Combine task and note synchronization into one
system so their durability, retry, ownership, and conflict rules stay consistent.
Preserve the task features already implemented.

The user selected the broader shared-system approach. Extending the separate
note queue would have been a smaller change but would retain two implementations
of scheduling, uploads, retries, and acknowledgements. A shared engine with typed
task/note adapters is the selected architecture; retaining two standalone engines
behind one facade would not fulfill that choice.

## User-visible behavior

- Creating either kind saves to IndexedDB first, shows a pending item immediately,
  and synchronizes after saving, on startup, or after reconnection. Background Sync
  uses the same processor when the browser supports it.
- An unuploaded note can be read, edited, and deleted from its card/local preview
  without opening a new server route. Repeated saves retain the latest text.
- Deleting a never-attempted creation cancels it locally. If creation or an edit
  has been attempted, preserve that immutable request, resolve it first, then
  delete using the acknowledged server ID and version.
- Pending deletions disappear from lists and dashboard note/task counts. A brief
  pending-deletion indicator remains on the relevant collection page.
- A failed/conflicting deletion reappears with retry and Keep note/task controls.
  Existing edit conflicts preserve local text with retry/discard controls.
- On creation acknowledgement, replace the temporary ID with the server ID while
  retaining a device alias and stable UI identity. Open previews remain open.
  Synced items use their regular detail-page links. Attachments require a server ID.
- Task completion, timestamps, grouping, badge counts, local previews, and
  description formatting keep their existing behavior.

## Scope and constraints

Use the existing Next.js APIs, Zod validation, IndexedDB, shadcn components, and
Serwist worker. Read the installed Next.js guides before implementation.
No new database, dependencies, account system, attachment queue, draft autosave,
reminders, or automatic text merging are included. The server remains a demo:
data and mutation receipts last for one Node.js process, and independent
serverless instances do not share them. Do not imply stronger guarantees.

## Shared architecture (implementation choices proposed by Codex)

Create a product-sync module under src/lib/products with:

1. A common change/attempt model and IndexedDB repository.
2. One queue processor, account verification path, upload locking strategy,
   acknowledgement/failure handling, and retry policy used by pages and workers.
3. One page lifecycle for startup, reconnect, retry timers, tab notifications,
   manual retry/discard, and subscription cleanup.
4. One Background Sync registration and worker handler.
5. Typed task/note adapters limited to payload validation, URL selection, merging,
   and presentation. Tasks carry title/description/dueDate/completed; notes carry
   title/content. Keep note content whitespace and existing size limits.

Keep the physical tasks and notes IndexedDB stores. A shared system does not
require moving all records into one physical store. Repository keys include
kind and owner where needed; task and note IDs must never collide logically.
Snapshots use a separate tagged record variant so they cannot enter the queue.

Common change records retain kind, owner, stable local identity, server baseline,
desired payload, create/update/delete action, revision, pending/failed/synced
status, local modification time, retry metadata, confirmation state, and an
optional immutable upload attempt. Attempts retain mutation ID, action, server
ID/version when applicable, submitted revision, and exact payload. Use
discriminated types rather than untyped task/note payload casting.

Thin compatibility exports may temporarily retain existing import paths, but they
must delegate to the common engine and lifecycle. Remove redundant implementations
and stale documentation when all callers have migrated.

## Queue and concurrency rules

Commit a local save before reporting success or starting network work. Coalesce
unattempted edits; never change the payload or mutation ID of an attempted upload.
An edit received during upload becomes the next revision. An acknowledgement
updates baseline/ID/version and clears only the submitted revision; newer desired
text, completion, local modification time, and deletion intent remain pending.

Persist deletion markers after acknowledgement so stale caches cannot resurrect
deleted items. A DELETE 404 means the item is already absent and succeeds locally.
An update 404 remains failed for review. Version conflicts never silently overwrite
the server. A failed item must not prevent other eligible queue entries syncing.

Use one shared Web Lock across tabs and workers, with a single running/rescan
state per page runtime. Retry/discard waits for an active upload before removing
its record. Local edits use atomic per-record IndexedDB transactions and may occur
during uploads. Without Web Locks, immutable attempts plus server receipts prevent
duplicate successful mutations, and acknowledgements compare attempt identity.

Network errors, timeouts, 408, 429, and 5xx remain pending, with page exponential
backoff capped at 60 seconds. Worker runs bypass the delay on their first pass
and reject while retryable work remains. Authentication, validation, and version
failures retain local data for attention. Session verification failures preserve
the queue; session-level retry scheduling must also avoid a tight retry loop.

All processing verifies the active account, and writes send X-FieldKit-User.
On sign-out/account change, stop scheduling the old account, clear timers and
listeners, and ensure running old work cannot upload using a new session.
Pending records remain saved for their owner. Manual actions enforce ownership.

## API duplicate protection

Generalize task-mutations into shared server mutation receipts for both kinds.
Scope receipt keys by owner and product kind; fingerprint method/action, target,
version, and payload. POST/PATCH/DELETE for notes accept optional UUID mutationId,
matching tasks. Identical retries return their original cloned acknowledgement;
reuse with different input returns 409. Preserve task receipts already held in a
development process. Preserve existing JSON fields, success/destination behavior,
version checks, account checks, and deletion cleanup of attachment bytes.

## Existing data and release transition

Bump IndexedDB to version 6 and normalize known records atomically in its upgrade
transaction, including snapshots, task changes/attempts, note edits/attempts,
synced overlays, and numeric offline note creations. Preserve owner, contents,
versions, timestamps, statuses, retry metadata, desired newer revisions, and
existing task mutation IDs exactly. No database clearing or blind reuploading.

Numeric offline note creations gain persistent UUID device identities and version
1 locally; retain their numeric identity as a migration alias. Missing legacy
owners map only to the existing original demo account, never to the current
session. Unrecognized records stay intact and are not uploaded automatically.
Conversion is committed once; repeated startup must not create duplicate records.

Legacy note attempts lack mutation IDs and may already have reached the server.
Before resending an uncertain legacy attempt, fetch its owned server record.
If version and submitted content exactly match the expected acknowledgement,
acknowledge it locally and preserve newer desired text. If the original baseline
version is still current, assign/persist a mutation ID and send the old attempt.
Any ambiguous newer version, missing update target, or content mismatch becomes
a visible conflict; never assume the old request succeeded or overwrite it.

Initialize migration under the shared lock and the old task/note locks in a
fixed order before opening the new schema. The new processor also observes
those transition locks so already-running old uploads can finish. Upgrade closes
old database connections through versionchange; old version-5 writes must fail
visibly rather than mix formats. If another tab blocks upgrade, request closing
that tab and retain all data. Browsers without Web Locks must still preserve old
attempts and use conservative reconciliation for ambiguous legacy note requests.

Register one new product-sync tag and channel. Continue accepting the two old
Background Sync tags and old page notification messages as aliases during this
release so previously registered work is not stranded. They dispatch the common
processor; registration for new saves uses only the new tag. No reconnect reload.

## Offline reads and UI integration

Both collection hooks apply the common overlays and deletion markers. Use the
existing task snapshot mechanism for both kinds so locally created notes remain
readable/editable even when no API cache is available. This is a supporting
implementation choice for reliable use of the requested offline note features.
Never combine one account's snapshot or changes with another account's data.
Missing legacy metadata uses honest fallbacks, without invented update times.

Route note creation, editing, and deletion through local saves online and offline.
Expose edit/delete actions on local note cards, retain local reading, and hide
attachment upload until the server ID exists. Detail pages resolve aliases and
show existing sync feedback. Discarding a failed deletion removes the local intent
and restores the latest readable server/snapshot version; discarding an unuploaded
creation removes that local note. UI labels refer to notes/tasks, not internal
queue implementation details.

## Acceptance and validation

- Preserve the meaningful existing task/note sync and product API checks.
- Exercise the common processor for both kinds, including reload durability,
  coalescing, creation response loss, edits/deletion during creation or editing,
  deletion markers, already-absent deletes, retries, conflict recovery, duplicate
  protection, ownership, account switching, and worker/page locking.
- Test version-5 migration for numeric creations, owned/unowned edits, in-flight
  attempts, newer desired revisions, snapshots, synced records, and unknown data.
  Repeat startup and reconcile a legacy note response lost before the upgrade.
- Verify real browser offline create/read/edit/delete/reload/reconnect flows,
  including new notes edited before upload and deleted before/during first sync.
  Verify previews remain open and task completion, timestamps, badges, and
  formatting still work. Check migration against real IndexedDB fixtures.
- Run lint, typecheck, production build, and the relevant suites; document actual
  results and remaining demo backend limits. Update README and synchronization
  docs/diagrams to describe the final shared system.

## Planning handoff

After approval, write a numbered implementation plan covering shared contracts
and migration, server receipts, engine/lifecycle/worker, task adapter regression,
note adapter/UI, and integration validation. Detailed helper/file names and test
harness organization are left to the builder within the boundaries above.
Implementation was explicitly authorized after approval. Commits remain a separate user action.
