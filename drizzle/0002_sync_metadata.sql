-- Database-maintained metadata applies to Drizzle and direct SQL writes alike.
CREATE FUNCTION public.fieldkit_update_sync_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Record identity, owner, and creation timestamp are immutable'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := clock_timestamp();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.fieldkit_update_sync_metadata() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER projects_sync_metadata
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.fieldkit_update_sync_metadata();
--> statement-breakpoint
CREATE TRIGGER tasks_sync_metadata
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.fieldkit_update_sync_metadata();
--> statement-breakpoint
CREATE TRIGGER notes_sync_metadata
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.fieldkit_update_sync_metadata();
--> statement-breakpoint
CREATE TRIGGER attachments_sync_metadata
BEFORE UPDATE ON public.attachments
FOR EACH ROW EXECUTE FUNCTION public.fieldkit_update_sync_metadata();
--> statement-breakpoint
CREATE TRIGGER reminders_sync_metadata
BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.fieldkit_update_sync_metadata();
--> statement-breakpoint
-- Browser access remains disabled until authentication and owner policies exist.
REVOKE ALL ON TABLE public.projects, public.tasks, public.notes,
  public.attachments, public.reminders FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE
  client_role text;
BEGIN
  FOR client_role IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE public.projects, public.tasks, public.notes, public.attachments, public.reminders FROM %I',
      client_role
    );
  END LOOP;
END;
$$;
