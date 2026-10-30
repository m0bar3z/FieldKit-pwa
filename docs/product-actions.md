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
refreshes the badge during note Background Sync. Badge failures do not block
data loading or synchronization. Visibility depends on the browser and
operating system; iOS/iPadOS also require notification permission. The app does
not request notification permission automatically or schedule separate badge
updates while closed. The dashboard keeps showing the overdue count in-app.

Existing note edits use `src/lib/products/save-item.ts`. The latest title and
content are saved in IndexedDB with the server ID and original version, then
overlaid onto the account's cached notes.
New offline-created notes are stored with their owner and displayed locally but
are not synchronized by the note-edit queue.
Existing unowned local edits and drafts belong to the original demo account.

Task creation, edits, completion, and deletion use `src/lib/products/task-sync/index.ts`. Saves first
commit to IndexedDB and immediately overlay the task list and dashboard counts.
The account's last task list is stored separately in the tasks store for reads
when the API and service-worker cache are unavailable. Pending new tasks can be
edited from the task list before upload. Temporary IDs become server IDs after
creation, with the old ID retained as a detail-page alias. Selecting a task that
has not uploaded opens a local preview dialog without a route request. The
preview survives reconnecting and receiving a server ID; synced task titles open
their detail pages normally. Task previews and detail pages preserve description
line breaks and wrap long text.
The PWA provider's automatic reconnect reload is disabled; the app's existing
online listeners refresh data and synchronize queues while preserving open dialogs.

Task lists, previews, and detail pages show last-updated date/time in the account's
time zone. List responses expose the server's `updatedAt` as `Task.updated`.
Local saves persist their own change time, including completion changes; retries
keep that time. An acknowledgement updates the server timestamp while retaining
the time of any newer pending edit. Older cached tasks without a known timestamp
omit the label until a local save or a fresh server response supplies one.

Task synchronization runs after saving, on startup/reconnection, on manual retry,
and through the `fieldkit-task-changes` Background Sync tag where supported.
Page and worker processing share Web Locks where available. Each upload persists
an immutable attempt with a UUID `mutationId`; POST/PATCH accept that optional
field and retain account-scoped receipts in server memory. DELETE and the completion
endpoint accept `mutationId` too. Repeating the same
request returns its original result. Reusing a mutation ID with different input
returns 409. This prevents duplicates and handles lost responses within one
demo server's lifetime, including when Web Locks are unavailable.

Edits made during upload stay pending and use the acknowledged server ID/version
for the next attempt. Network/server failures retry with exponential backoff
capped at 60 seconds while open. Authentication/validation/version failures keep
the local changes and offer retry/discard controls. Conflicts never overwrite
the server version automatically. Completion coalesces with pending edits or creation,
updates groups/counts/badges locally, and can change again during upload. Deletion
hides the task locally and keeps a tombstone, including after successful sync,
so stale API caches cannot restore it. An unattempted local creation is canceled
without a network mutation; an uncertain/in-flight creation or edit finishes
first, then deletion uses its acknowledged server ID/version. Already-absent
tasks (404) satisfy the queued deletion. Conflicting/failed deletions reappear
with retry and “Keep task” controls. Attachment
uploads for new tasks wait for a server ID. Unsaved drafts are not persisted.

Note edits request service worker Background Sync where supported. Saving,
startup, reconnection, and manual retry register the `fieldkit-note-edits` tag
when pending edits exist. The service worker handles that tag with `waitUntil`,
uploads the saved edits, and notifies open pages to refresh. Browser scheduling
controls when background attempts run and whether they are retried; completion
after closing the page is not guaranteed.

Synchronization also runs after saving, at app startup, and on reconnect while
the app is open, including when Background Sync is unavailable or registration
fails. Its public entry point is `src/lib/products/note-sync/index.ts`.
The page and worker share the queue processor in `note-sync/engine.ts` and the
same IndexedDB records. Network errors, timeouts, HTTP 408/429, and server
failures retain pending edits. Page retries use exponential backoff capped at
60 seconds; background attempts bypass that delay on their first pass and reject
while pending edits remain so the browser can retry. Authentication, validation,
and version conflicts retain the local edit and offer retry/discard controls.
Web Locks serialize uploads and discard operations across supported browser tabs
and the service worker; a busy caller waits for the lock. Updates use the note's
server version to detect conflicts. If the server saves an edit but its response is
lost, retrying can report a version conflict; the local edit remains available
for review. A synchronized note snapshot remains local so an older cached
response cannot undo the acknowledged edit.

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
