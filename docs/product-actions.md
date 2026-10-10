# Core product actions

Tasks and notes are saved through authenticated server actions in one personal
workspace. The dashboard at `/` shows due-today, overdue, and note counts, task
lists, and recent notes. `/tasks` and `/notes` list all owned active items and link
to creation and detail pages. No project selection is required.

Tasks can be searched by title/description and filtered by completion or due-date
status; notes can be searched by title/content. Empty search results are distinct
from an empty workspace. Dashboard counts use active owned records, independently
of search filters. Detail pages accept database-generated IDs and show stored
attachment metadata and the next pending task reminder.

Due dates are calendar dates and never shift with time zones. The browser saves
its IANA time zone in a preference cookie so the server can group due dates using
the user's local day and display reminder instants in that same zone. Before the
browser supplies this preference, UTC is used. Pages refresh when the foreground
local day or time zone changes. Reminder editing and delivery are not implemented.

Apply the existing numbered migrations in `drizzle/` before using these actions.
The personal workspace requires migrations 0000–0006, including the attachment
storage setup in 0005 and project retirement in 0006. Existing items are preserved.
See `authentication.md` for Supabase configuration and database permissions, and
`attachments.md` for private storage setup and file operations.

All actions validate IDs, versions, required titles, text lengths, calendar
dates, and completion values. Ownership comes from the verified session and RLS. Stale edits, completion changes, and deletes are rejected
instead of overwriting a newer version. Failed saves keep entered form values.

Forms show saving/deleting indicators, inline validation and request errors, and
dismissible success feedback after navigation. A synchronous submission lock
prevents rapid double submissions before React's pending state updates. Controls
stay disabled while the request or successful navigation is pending. Dialogs
close after a successful save and cannot be dismissed while saving.

Changed forms show an unsaved indicator. Returning every field to its initial
value clears it. App links, sign-out, and dialog dismissal ask before discarding
edits; reload and tab/window close use the browser's native warning. These guards
do not intercept browser Back/Forward within the same document, and native
unload warnings depend on browser support. Automatic clock refreshes pause while
a form is dirty or saving. Drafts are not persisted to browser storage.

Workspace pages show loading skeletons, retryable loading errors, contextual
empty/search-result states, and a missing-item page for unavailable IDs.

Deletion is a soft delete with no restore UI. Deleting a task or note also marks
its attachment metadata (and task reminders) as deleted in one transaction.
Existing deleted metadata keeps its original deletion timestamps. Deleted records
disappear from pages; database triggers maintain timestamps and versions. Storage
objects are retained by task/note deletion; explicit attachment removal deletes
its stored file. No automatic cleanup or synchronization is implemented. Item
locks serialize edits, completion, deletion, and attachment publication.

Run `pnpm test:product` to exercise input validation and actual PostgreSQL
transactions, ownership policies, stale writes, deletion, and rollback in an
isolated PGlite database. It does not connect to Supabase or alter remote data.
Reminder editing and PWA features remain separate.
