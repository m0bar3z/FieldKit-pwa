# Basic attachments

Create a task or note, open its detail page, choose **Add file**, and select a
file. Upload it, download it, or remove it after confirming the deletion. A failed
upload keeps the file selected for retry. Uploads and removals show pending,
success, and error feedback and block duplicate submissions.

Supported types are JPEG, PNG, WebP, GIF, PDF, and UTF-8 plain text. Files must be
non-empty and at most 3 MiB (3,145,728 bytes). The client checks size, extension,
and MIME type; the server repeats these checks, verifies file signatures or UTF-8
text, and rejects filenames containing paths/control characters or exceeding
255 characters. Downloads are served as attachments with `nosniff` and no caching.

Apply `drizzle/0005_attachment_storage.sql` through the existing migration runner
after migrations 0000–0004. It creates the private `fieldkit-attachments` bucket,
enforces the same size/type limits, and adds Storage RLS. No extra environment
variables or service-role key are needed: Storage uses the verified user's
Supabase session.

Object keys are `<auth-user-id>/<tasks-or-notes>/<item-id>/<attachment-id>`.
Storage reads/deletes are restricted to that user's namespace; uploads also
require owned pending metadata and an active task/note and project. A restrictive
ownership policy protects this bucket even if broader policies are added later.
Objects cannot be overwritten. Server operations additionally check ownership,
active parents, canonical keys, and removal versions through authenticated
database transactions.

An upload reserves metadata with a null storage key, uploads outside database
transactions, then checks/locks the active parent again before publishing the
key. Pending rows are hidden from pages. Failures attempt to delete any uploaded
object and soft-delete pending metadata. Interrupted requests or failed cleanup
can leave private orphan files/pending rows; automatic background cleanup is not
part of this feature.

Explicit file removal deletes the storage object before marking its metadata as
deleted. A failed storage deletion leaves metadata intact; a failed metadata
write can be retried against the same object key. Existing project/task/note
deletion still retains storage objects, while hiding their metadata. Offline
blobs, queued uploads, synchronization, and previews are not implemented.
