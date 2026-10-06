# Core product actions

Projects, tasks, and notes are saved on the server through authenticated actions.
The existing pages show owned database records; completion changes update task
lists and project counts. Tasks and notes can move between the user's active
projects. Creating an item requires an active project.

Projects can be searched by name/description and filtered by category. Tasks can
be searched by title/description/project and filtered by completion or due-date
status; notes can be searched by title/content/project. Empty results are distinct
from an empty workspace. Project progress and dashboard counts use active owned
records, independently of search filters. Detail pages accept database-generated
IDs and show stored attachment metadata and the next pending task reminder.

Due dates are calendar dates and never shift with time zones. The browser saves
its IANA time zone in a preference cookie so the server can group due dates using
the user's local day and display reminder instants in that same zone. Before the
browser supplies this preference, UTC is used. Pages refresh when the foreground
local day or time zone changes. Reminder editing and delivery are not implemented.

Apply the existing numbered migrations in `drizzle/` before using these actions.
Core CRUD uses migrations 0000–0004; attachment storage also requires 0005.
See `authentication.md` for Supabase configuration and database permissions, and
`attachments.md` for private storage setup and file operations.

All actions validate IDs, versions, required names/titles, text lengths, project
categories, calendar dates, and completion values. Ownership comes from the
verified session and RLS. Stale edits, completion changes, and deletes are rejected
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

Deletion is a soft delete with no restore UI. Deleting a project marks its tasks,
notes, attachment metadata, and reminders as deleted in one transaction. Deleting
a task or note also deletes its associated metadata. Existing deleted children
keep their original deletion metadata. Deleted records disappear from the pages;
the database's triggers maintain timestamps and versions. Storage objects are
retained by project/task/note deletion; explicit attachment removal deletes its
stored file. No automatic cleanup or synchronization is implemented. Project locks
serialize item creation and moves with deletion through these server actions.

Run `pnpm test:product` to exercise input validation and actual PostgreSQL
transactions, ownership policies, stale writes, deletion, and rollback in an
isolated PGlite database. It does not connect to Supabase or alter remote data.
Reminder editing and PWA features remain separate.
