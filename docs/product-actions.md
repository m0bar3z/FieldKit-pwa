# In-memory product API

Each signed-in account owns its tasks, notes, and attachments. Next.js Route Handlers read
and modify the arrays in `src/lib/memory/store.ts`. Every record includes a server-assigned
`userId`; list, read, edit, completion, delete, and file operations check that owner.
An inaccessible item returns 404. No database, migrations,
Supabase client, or product Server Actions are required.

Every API request includes a simulated random delay of 1–3 seconds, including
authentication and file downloads. The delay is implemented in
`src/lib/api/delay.ts`.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/tasks?userId=...&timeZone=Asia%2FTehran` | GET | The account's UI-ready tasks, attachment metadata, local date, and task counts |
| `/api/tasks` | POST | Create a task for the signed-in account |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Read, edit, or delete a task |
| `/api/tasks/[id]/completion` | PATCH | Change completion |
| `/api/notes?userId=...&timeZone=Asia%2FTehran` | GET | The account's UI-ready notes and attachment metadata |
| `/api/notes` | POST | Create a note for the signed-in account |
| `/api/notes/[id]` | GET, PATCH, DELETE | Read, edit, or delete a note |

Product writes accept JSON. A task has `title`, `description`, and `dueDate`; a
note has `title` and `content`. Task creation/edits also accept an optional boolean
`completed` so pending text and completion changes can upload together. Edit/delete requests include `version` as a string
(e.g. `"1"`). Completion accepts a boolean `completed` plus the version string.
IDs come from the route URL. New records receive UUIDs, timestamps, and version 1;
changes increment the version. Stale writes return HTTP 409; missing items return
404. Client and server use shared Zod schemas.

Task pages use `useTasks`; note pages use `useNotes`. The dashboard uses both.
`TasksData` and `NotesData` are separate response types. Successful form submissions
announce success and trigger `refreshTasks` or `refreshNotes` for the affected data.
Search/filtering stays in the client. Requests have loading, error,
retry, and empty states. Each form retains its own async submit handler and
React Hook Form/Zod validation; failed saves retain inputs. No unsaved-change
confirmation or automatic draft storage is implemented.

Due dates remain calendar dates. The browser sends its IANA time zone so the API
calculates overdue/today status consistently. `TaskClock` refreshes task data
when the local day or time zone changes. Reminder editing/delivery remains
a TODO.

The installed app icon shows the number of overdue, incomplete tasks through
the Badging API where supported. Task loads update the count, including
after task changes and local date/time zone changes. Zero overdue tasks,
sign-out, or an expired session clear the badge. The service worker also
refreshes the badge during shared Background Sync. Badge failures do not block
data loading or synchronization. Visibility depends on the browser and
operating system; iOS/iPadOS also require notification permission. The app does
not request notification permission automatically or schedule separate badge
updates while closed. The dashboard keeps showing the overdue count in-app.

Task and note saves use one system in `src/lib/products/product-sync/`.
`writes.ts` commits local creation, editing, deletion, and task completion before
reporting success. `storage.ts` reads the common change records and account-owned
list snapshots; `adapters.ts` applies typed task/note overlays and counts.
The separate `task-sync` / `note-sync` entry points are thin compatibility exports.

New notes and tasks are immediately readable, editable, and deletable without
their first upload. Their cards/previews do not require a detail-page request.
Creation acknowledgement replaces the device ID with the server ID, retains a
stable alias, and preserves open previews. Attachments wait for a server ID and
require connectivity. Unsaved drafts are not persisted.

`engine.ts` processes both kinds through the same session checks, immutable
upload attempts, locking, acknowledgement, and retry policy. `runtime.ts` owns
one subscription lifecycle, running/rescan state, reconnect handler, retry timer,
and cross-tab channel. `worker.ts` calls that same processor. New Background Sync
registrations use `fieldkit-products`; the worker accepts the old
`fieldkit-note-edits` and `fieldkit-task-changes` tags as aliases.
The PWA provider does not reload on reconnect; existing listeners refresh data
and synchronize queues while preserving open dialogs.

POST/PATCH/DELETE for both kinds accept optional UUID `mutationId` values.
Shared server mutation receipts are scoped by account and kind; repeating an
identical request returns its original acknowledgement, while reusing a mutation
ID with a different request returns 409. Existing task receipts survive a
development module reload. These receipts share the demo server's process-local
lifetime and do not provide durability across restarts or serverless instances.

Unattempted edits coalesce. Edits made during upload remain pending and use the
acknowledged ID/version on their next attempt. Deleting an unattempted creation
cancels it locally; deletion during an attempted creation/edit resolves that
request first. Deletion markers remain after acknowledgement so stale caches
cannot restore deleted items. DELETE 404 is acknowledged as already absent.
Conflicting/failed deletions reappear with retry and Keep note/task controls.

Network errors, timeouts, HTTP 408/429, and server failures remain pending.
Page retries use exponential backoff capped at 60 seconds, including session
lookup failures. Worker runs bypass the delay on their first pass and reject
while retryable work remains. Authentication, validation, and version conflicts
preserve local changes for review and never silently overwrite server content.
Web Locks serialize uploads and retry/discard across pages and workers where
supported. Without them, durable immutable attempts and server receipts prevent
duplicate successful mutations. Browser scheduling controls Background Sync;
completion with all pages closed is not guaranteed.

IndexedDB version 6 migrates saved task changes, attempts, snapshots, note edits,
and numeric offline note creations in one upgrade transaction. Missing legacy
owners remain with the original demo account. Numeric note IDs become stable
UUID device IDs with migration aliases. Unknown records remain intact and do not
enter the upload queue. Previously attempted note updates without mutation IDs
are reconciled against the server before resending: an exact expected
acknowledgement is accepted, an unchanged baseline can be sent with a persisted
mutation ID, and ambiguous newer content remains a visible conflict. Transition
locks let older uploads finish; old version-5 writers must reload after upgrade.

Task list, preview, and detail timestamps retain local modification times during
retries and newer revisions, then accept acknowledged server times. Task groups,
counts, and overdue badges reflect local completion/deletion. Note timestamps,
excerpts, search results, and dashboard counts reflect the same local overlays.

The processor verifies the active session before selecting that account's local
edits. Uploads include an expected account header, which the API checks against
the session. Switching accounts cannot upload another account's queued changes.
Manual retry/discard also check the local owner.

The service worker caches successful task/note list responses by URL, including
the account ID and time zone, and verifies the response's account header. Other
API requests use the network. Sign-in/sign-out clear private runtime caches and
notify other open tabs to reload their session; local queued edits remain saved
for their owner. Static asset caching and the offline fallback page remain.

Deleting an item marks it and its attachments deleted; related file bytes are
released. Deleted records stay in the arrays but are hidden from GET responses.
There is no restore action. Files are otherwise managed through the attachment
API described in `attachments.md`.

Data is temporary. Sessions of the same account share that account's records;
different accounts have separate records.
Restarting the Node.js process empties the arrays. Separate processes/serverless
instances have independent stores, so use one local Node.js instance for a
consistent PWA learning session.
