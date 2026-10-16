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
data when the local day or time zone changes. Reminder editing/delivery and
IndexedDB/offline mutations remain TODOs.

Deleting an item marks it and its attachments deleted; related file bytes are
released. Deleted records stay in the arrays but are hidden from GET responses.
There is no restore action. Files are otherwise managed through the attachment
API described in `attachments.md`.

Data is temporary and shared by every session of the single demo account.
Restarting the Node.js process empties the arrays. Separate processes/serverless
instances have independent stores, so use one local Node.js instance for a
consistent PWA learning session.
