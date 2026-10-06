-- Custom SQL migration file, put your code below! --
-- Private objects; the application forwards each user's session to Storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fieldkit-attachments', 'fieldkit-attachments', false, 3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
--> statement-breakpoint
-- Restrictive boundary also prevents broader policies from exposing this bucket.
CREATE POLICY fieldkit_attachment_owner_boundary ON storage.objects
AS RESTRICTIVE FOR ALL TO PUBLIC
USING (bucket_id <> 'fieldkit-attachments' OR (
  (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND coalesce((SELECT auth.jwt())->>'is_anonymous', 'false') = 'false'
))
WITH CHECK (bucket_id <> 'fieldkit-attachments' OR (
  (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND coalesce((SELECT auth.jwt())->>'is_anonymous', 'false') = 'false'
));
--> statement-breakpoint
CREATE POLICY fieldkit_attachment_read ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'fieldkit-attachments'
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
);
--> statement-breakpoint
CREATE POLICY fieldkit_attachment_upload ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'fieldkit-attachments'
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND array_length(storage.foldername(storage.objects.name), 1) = 3
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    JOIN public.users u ON u.id = a.owner_id
    WHERE u.auth_id = (SELECT auth.uid())
      AND a.id::text = storage.filename(storage.objects.name)
      AND a.deleted_at IS NULL AND a.storage_key IS NULL
      AND (
        ((storage.foldername(storage.objects.name))[2] = 'tasks'
          AND a.task_id::text = (storage.foldername(storage.objects.name))[3]
          AND EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p
            ON p.id = t.project_id AND p.owner_id = t.owner_id
            WHERE t.id = a.task_id AND t.owner_id = a.owner_id
              AND t.deleted_at IS NULL AND p.deleted_at IS NULL))
        OR ((storage.foldername(storage.objects.name))[2] = 'notes'
          AND a.note_id::text = (storage.foldername(storage.objects.name))[3]
          AND EXISTS (SELECT 1 FROM public.notes n JOIN public.projects p
            ON p.id = n.project_id AND p.owner_id = n.owner_id
            WHERE n.id = a.note_id AND n.owner_id = a.owner_id
              AND n.deleted_at IS NULL AND p.deleted_at IS NULL))
      )
  )
);
--> statement-breakpoint
-- SELECT also permits the owner to remove failed uploads and deleted-item files.
CREATE POLICY fieldkit_attachment_remove ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'fieldkit-attachments'
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
);
--> statement-breakpoint
CREATE POLICY fieldkit_attachment_no_overwrite ON storage.objects
AS RESTRICTIVE FOR UPDATE TO PUBLIC USING (bucket_id <> 'fieldkit-attachments')
WITH CHECK (bucket_id <> 'fieldkit-attachments');
