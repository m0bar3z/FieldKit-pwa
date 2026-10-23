# In-memory attachments

Open a task or note and choose **Add file**. Files are uploaded with
`POST /api/attachments` using multipart fields `kind`, `parentId`, and `file`.
`GET /api/attachments/[id]` downloads the file; `DELETE /api/attachments/[id]`
removes it with a JSON `version` string. All routes require a demo session and
check that the parent task/note is still active and belongs to the signed-in
account. Attachments also have an owner; another account cannot upload to the
parent, download the file, or remove it.

Metadata and bytes are held in the attachment array in `src/lib/memory/store.ts`.
No storage bucket, external service, or environment configuration is required.
Restarting the server loses the files along with tasks and notes. Signed sessions
remain valid while the signing secret stays the same.

Supported types are JPEG, PNG, WebP, GIF, PDF, and UTF-8 text, with a 3 MiB maximum
per file. Client Zod validation checks selection, filename, extension, MIME type,
and size. The server repeats validation and checks file signatures or UTF-8
bytes. Invalid uploads are never added to the array. Failed uploads keep the file
selected for retry. Downloads use attachment disposition, nosniff, and no-store.

Removing a file soft-deletes its metadata and releases its bytes. Deleting its
parent does the same. Version checks reject stale removals. Offline blobs,
queued uploads, synchronization, and previews remain separate PWA tasks.
