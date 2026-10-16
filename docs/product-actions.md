# In-memory product API

Tasks and notes live in one personal demo workspace. Next.js Route Handlers read
and modify the arrays in `src/lib/memory/store.ts`. No database, migrations,
Supabase client, or product Server Actions are required.

Every API request includes a simulated random delay of 1–3 seconds, including
authentication and file downloads. The delay is implemented in
`src/lib/api/delay.ts`.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/workspace?timeZone=Asia%2FTehran` | GET | UI-ready tasks, notes, attachment metadata, and dashboard counts |
| `/api/tasks` | GET, POST | List task records or create a task |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Read, edit, or delete a task |
| `/api/tasks/[id]/completion` | PATCH | Change completion |
| `/api/notes` | GET, POST | List note records or create a note |
| `/api/notes/[id]` | GET, PATCH, DELETE | Read, edit, or delete a note |

Product writes accept JSON. A task has `title`, `description`, and `dueDate`; a
note has `title` and `content`. Edit/delete requests include `version` as a string
(e.g. `"1"`). Completion accepts a boolean `completed` plus the version string.
IDs come from the route URL. New records receive UUIDs, timestamps, and version 1;
changes increment the version. Stale writes return HTTP 409; missing items return
404. Client and server use shared Zod schemas.

The dashboard, lists, and detail components use `useWorkspace` to fetch
`/api/workspace`. Successful form submissions announce success and trigger a
refetch. Search/filtering stays in the client. Requests have loading, error,
retry, and empty states. Each form retains its own async submit handler and
React Hook Form/Zod validation; failed saves retain inputs. No unsaved-change
confirmation or automatic draft storage is implemented.

Due dates remain calendar dates. The browser sends its IANA time zone so the API
calculates overdue/today status consistently. The workspace clock refreshes API
data when the local day or time zone changes. Reminder editing/delivery remains
a TODO.

Existing note edits use `src/lib/products/save-item.ts`. The latest title and
content are saved in IndexedDB with the server ID and original version, then
overlaid onto cached workspace data. Tasks retain their direct API save path.
New offline-created notes are displayed locally but are not synchronized by the
note-edit queue.

`note-sync.ts` runs after saving, at app startup, and on reconnect while the app
is open. Network errors, timeouts, HTTP 408/429, and server failures retry with
exponential backoff capped at 60 seconds. Authentication, validation, and version
conflicts retain the local edit and offer retry/discard controls. Web Locks
coordinate sync across supported browser tabs. Updates use the note's server
version to detect conflicts. If the server saves an edit but its response is
lost, retrying can report a version conflict; the local edit remains available
for review. A synchronized note snapshot remains local so an older cached
response cannot undo the acknowledged edit.

Deleting an item marks it and its attachments deleted; related file bytes are
released. Deleted records stay in the arrays but are hidden from GET responses.
There is no restore action. Files are otherwise managed through the attachment
API described in `attachments.md`.

Data is temporary and shared by every session of the single demo account.
Restarting the Node.js process empties the arrays. Separate processes/serverless
instances have independent stores, so use one local Node.js instance for a
consistent PWA learning session.
