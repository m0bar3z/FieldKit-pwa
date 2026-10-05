-- Run after all numbered migrations in an isolated PostgreSQL database.
BEGIN;

DO $$
DECLARE
  first_owner integer;
  second_owner integer;
  first_project uuid;
  second_project uuid;
  first_task uuid;
  first_note uuid;
  task_attachment uuid;
  first_reminder uuid;
  table_name text;
  row_version integer;
  row_updated_at timestamptz;
  affected_rows integer;
  client_role text;
BEGIN
  INSERT INTO users (full_name) VALUES ('Schema test owner A') RETURNING id INTO first_owner;
  INSERT INTO users (full_name) VALUES ('Schema test owner B') RETURNING id INTO second_owner;
  INSERT INTO projects (owner_id, name) VALUES (first_owner, 'Trip') RETURNING id INTO first_project;
  INSERT INTO projects (owner_id, name) VALUES (second_owner, 'Work') RETURNING id INTO second_project;
  INSERT INTO tasks (owner_id, project_id, title, due_date)
    VALUES (first_owner, first_project, 'Book hotel', '2026-10-05') RETURNING id INTO first_task;
  INSERT INTO notes (owner_id, project_id, title)
    VALUES (first_owner, first_project, 'Travel notes') RETURNING id INTO first_note;
  INSERT INTO attachments (owner_id, task_id, file_name, mime_type, byte_size)
    VALUES (first_owner, first_task, 'map.png', 'image/png', 1024) RETURNING id INTO task_attachment;
  INSERT INTO attachments (owner_id, note_id, file_name, mime_type, byte_size)
    VALUES (first_owner, first_note, 'notes.txt', 'text/plain', 0);
  INSERT INTO reminders (owner_id, task_id, remind_at)
    VALUES (first_owner, first_task, '2026-10-05 10:00:00+03:30') RETURNING id INTO first_reminder;

  IF (SELECT remind_at FROM reminders WHERE id = first_reminder)
    <> '2026-10-05 06:30:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Reminder timezone was not preserved';
  END IF;
  IF (SELECT completed FROM tasks WHERE id = first_task)
    OR (SELECT content FROM notes WHERE id = first_note) <> ''
    OR (SELECT category FROM projects WHERE id = first_project) <> 'personal'
    OR (SELECT storage_key FROM attachments WHERE id = task_attachment) IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected product defaults';
  END IF;

  -- A child's owner must match its parent, even when both owners exist.
  BEGIN
    INSERT INTO tasks (owner_id, project_id, title) VALUES (first_owner, second_project, 'Wrong owner');
    RAISE EXCEPTION 'Accepted task in another owner''s project';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO notes (owner_id, project_id, title) VALUES (first_owner, second_project, 'Wrong owner');
    RAISE EXCEPTION 'Accepted note in another owner''s project';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO attachments (owner_id, task_id, file_name, mime_type, byte_size)
      VALUES (second_owner, first_task, 'wrong.txt', 'text/plain', 1);
    RAISE EXCEPTION 'Accepted task attachment owned by another user';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO attachments (owner_id, note_id, file_name, mime_type, byte_size)
      VALUES (second_owner, first_note, 'wrong.txt', 'text/plain', 1);
    RAISE EXCEPTION 'Accepted note attachment owned by another user';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO reminders (owner_id, task_id, remind_at) VALUES (second_owner, first_task, now());
    RAISE EXCEPTION 'Accepted reminder owned by another user';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO projects (owner_id, name) VALUES (-1, 'Missing user');
    RAISE EXCEPTION 'Accepted a missing owner';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO tasks (owner_id, project_id, title) VALUES (first_owner, gen_random_uuid(), 'Missing parent');
    RAISE EXCEPTION 'Accepted a missing project';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO attachments (owner_id, file_name, mime_type, byte_size)
      VALUES (first_owner, 'orphan.txt', 'text/plain', 1);
    RAISE EXCEPTION 'Accepted an attachment without a parent';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO attachments (owner_id, task_id, note_id, file_name, mime_type, byte_size)
      VALUES (first_owner, first_task, first_note, 'ambiguous.txt', 'text/plain', 1);
    RAISE EXCEPTION 'Accepted an attachment with two parents';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO attachments (owner_id, task_id, file_name, mime_type, byte_size)
      VALUES (first_owner, first_task, 'invalid.txt', 'text/plain', -1);
    RAISE EXCEPTION 'Accepted a negative file size';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO attachments (owner_id, task_id, file_name, mime_type, byte_size, storage_key)
      VALUES (first_owner, first_task, 'invalid.txt', 'text/plain', 1, '  ');
    RAISE EXCEPTION 'Accepted a blank storage key';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO projects (owner_id, name) VALUES (first_owner, '  ');
    RAISE EXCEPTION 'Accepted a blank project name';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO tasks (owner_id, project_id, title, version) VALUES (first_owner, first_project, 'Invalid version', 0);
    RAISE EXCEPTION 'Accepted an invalid version';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO reminders (owner_id, task_id) VALUES (first_owner, first_task);
    RAISE EXCEPTION 'Accepted a reminder without a time';
  EXCEPTION WHEN not_null_violation THEN NULL;
  END;

  -- Every product table maintains its version and timestamp through direct SQL.
  FOREACH table_name IN ARRAY ARRAY['projects', 'tasks', 'notes', 'attachments', 'reminders'] LOOP
    EXECUTE format('SELECT version FROM public.%I WHERE owner_id = $1 LIMIT 1', table_name)
      INTO row_version USING first_owner;
    IF row_version <> 1 THEN
      RAISE EXCEPTION 'Unexpected initial version for %', table_name;
    END IF;
    EXECUTE format('UPDATE public.%I SET version = 999, updated_at = ''2000-01-01'' WHERE owner_id = $1', table_name)
      USING first_owner;
    EXECUTE format('SELECT version, updated_at FROM public.%I WHERE owner_id = $1 LIMIT 1', table_name)
      INTO row_version, row_updated_at USING first_owner;
    IF row_version <> 2 OR row_updated_at < now() THEN
      RAISE EXCEPTION 'Metadata trigger did not maintain %', table_name;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', table_name)::regclass) THEN
      RAISE EXCEPTION 'RLS not enabled for %', table_name;
    END IF;
    FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
      AND (rolname = 'anon' OR NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name
      )) LOOP
      IF has_table_privilege(client_role, format('public.%I', table_name), 'SELECT,INSERT,UPDATE,DELETE') THEN
        RAISE EXCEPTION 'Unexpected browser grant on % for %', table_name, client_role;
      END IF;
    END LOOP;
  END LOOP;

  BEGIN
    UPDATE projects SET owner_id = second_owner WHERE id = first_project;
    RAISE EXCEPTION 'Accepted ownership reassignment';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE tasks SET id = gen_random_uuid() WHERE id = first_task;
    RAISE EXCEPTION 'Accepted identity reassignment';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE notes SET created_at = '2000-01-01' WHERE id = first_note;
    RAISE EXCEPTION 'Accepted creation timestamp reassignment';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM projects WHERE id = first_project;
    RAISE EXCEPTION 'Hard deletion removed a project with children';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM tasks WHERE id = first_task;
    RAISE EXCEPTION 'Hard deletion removed a task with children';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  UPDATE tasks SET completed = true WHERE id = first_task AND version = 1;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'Stale-version write succeeded'; END IF;
  UPDATE tasks SET deleted_at = now() WHERE id = first_task AND version = 2;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 OR NOT EXISTS (SELECT 1 FROM tasks WHERE id = first_task AND deleted_at IS NOT NULL AND version = 3)
    OR NOT EXISTS (SELECT 1 FROM attachments WHERE id = task_attachment)
    OR NOT EXISTS (SELECT 1 FROM reminders WHERE id = first_reminder) THEN
    RAISE EXCEPTION 'Tombstone update lost the task or its related records';
  END IF;
END;
$$;

-- Even an accidentally granted client must be denied by the policy-free RLS.
CREATE ROLE fieldkit_schema_test_client NOLOGIN;
GRANT USAGE ON SCHEMA public TO fieldkit_schema_test_client;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects, tasks, notes, attachments, reminders TO fieldkit_schema_test_client;
SET LOCAL ROLE fieldkit_schema_test_client;
DO $$
DECLARE
  table_name text;
  visible_rows bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['projects', 'tasks', 'notes', 'attachments', 'reminders'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO visible_rows;
    IF visible_rows <> 0 THEN RAISE EXCEPTION 'RLS exposed rows from %', table_name; END IF;
    EXECUTE format('UPDATE public.%I SET version = 500', table_name);
    GET DIAGNOSTICS visible_rows = ROW_COUNT;
    IF visible_rows <> 0 THEN RAISE EXCEPTION 'RLS allowed client updates to %', table_name; END IF;
    EXECUTE format('DELETE FROM public.%I', table_name);
    GET DIAGNOSTICS visible_rows = ROW_COUNT;
    IF visible_rows <> 0 THEN RAISE EXCEPTION 'RLS allowed client deletion from %', table_name; END IF;
  END LOOP;
  BEGIN
    INSERT INTO projects (owner_id, name) VALUES (1, 'Disallowed browser write');
    RAISE EXCEPTION 'RLS allowed a client insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

ROLLBACK;
