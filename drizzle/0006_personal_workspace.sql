ALTER TABLE "notes" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
DROP POLICY "projects_owner_insert" ON "projects" CASCADE;--> statement-breakpoint
DROP POLICY "projects_owner_update" ON "projects" CASCADE;--> statement-breakpoint
DROP POLICY "projects_owner_delete" ON "projects" CASCADE;
--> statement-breakpoint
-- Uploads belong to the active owned task/note, without requiring a project.
-- Update Storage when its schema is present.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE $policy$
      ALTER POLICY fieldkit_attachment_upload ON storage.objects WITH CHECK (
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
                AND EXISTS (SELECT 1 FROM public.tasks t
                  WHERE t.id = a.task_id AND t.owner_id = a.owner_id
                    AND t.deleted_at IS NULL))
              OR ((storage.foldername(storage.objects.name))[2] = 'notes'
                AND a.note_id::text = (storage.foldername(storage.objects.name))[3]
                AND EXISTS (SELECT 1 FROM public.notes n
                  WHERE n.id = a.note_id AND n.owner_id = a.owner_id
                    AND n.deleted_at IS NULL))
            )
        )
      )
    $policy$;
  END IF;
END;
$$;
