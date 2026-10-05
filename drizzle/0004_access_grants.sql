-- Supabase provides these roles. Identity mappings are never client-writable.
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON SEQUENCE public.users_id_seq FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.users TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects, public.tasks,
  public.notes, public.attachments, public.reminders TO authenticated;
