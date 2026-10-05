-- Run only in a disposable database after all migrations, as an administrator.
BEGIN;

CREATE FUNCTION pg_temp.assert_sqlstate(statement text, expected_state text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE caught_state text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS caught_state = RETURNED_SQLSTATE;
  END;
  IF caught_state IS DISTINCT FROM expected_state THEN
    RAISE EXCEPTION 'Expected SQLSTATE %, got % for %', expected_state, caught_state, statement;
  END IF;
END;
$$;

INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
INSERT INTO public.users (id, auth_id) VALUES
  (-101, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
  (-102, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
INSERT INTO projects (id, owner_id, name) VALUES
  ('11111111-1111-4111-8111-111111111111', -101, 'Owner A'),
  ('22222222-2222-4222-8222-222222222222', -102, 'Owner B');
INSERT INTO tasks (id, owner_id, project_id, title) VALUES
  ('11111111-1111-4111-8111-111111111112', -101, '11111111-1111-4111-8111-111111111111', 'A task'),
  ('22222222-2222-4222-8222-222222222223', -102, '22222222-2222-4222-8222-222222222222', 'B task');
INSERT INTO notes (id, owner_id, project_id, title) VALUES
  ('11111111-1111-4111-8111-111111111113', -101, '11111111-1111-4111-8111-111111111111', 'A note'),
  ('22222222-2222-4222-8222-222222222224', -102, '22222222-2222-4222-8222-222222222222', 'B note');
INSERT INTO attachments (owner_id, task_id, file_name, mime_type, byte_size) VALUES
  (-101, '11111111-1111-4111-8111-111111111112', 'a.txt', 'text/plain', 1),
  (-102, '22222222-2222-4222-8222-222222222223', 'b.txt', 'text/plain', 1);
INSERT INTO reminders (owner_id, task_id, remind_at) VALUES
  (-101, '11111111-1111-4111-8111-111111111112', now()),
  (-102, '22222222-2222-4222-8222-222222222223', now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
DO $$
DECLARE table_name text; matching_rows bigint; changed_rows bigint;
BEGIN
  IF (SELECT count(*) FROM public.users) <> 1 OR (SELECT id FROM public.users) <> -101 THEN
    RAISE EXCEPTION 'User mappings are not isolated';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['projects', 'tasks', 'notes', 'attachments', 'reminders'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO matching_rows;
    IF matching_rows <> 1 THEN RAISE EXCEPTION 'Owner A sees other users'' rows in %', table_name; END IF;
    EXECUTE format('UPDATE public.%I SET version = 999 WHERE owner_id = -102', table_name);
    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    IF changed_rows <> 0 THEN RAISE EXCEPTION 'Owner A updated owner B''s %', table_name; END IF;
    EXECUTE format('DELETE FROM public.%I WHERE owner_id = -102', table_name);
    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    IF changed_rows <> 0 THEN RAISE EXCEPTION 'Owner A deleted owner B''s %', table_name; END IF;
    EXECUTE format('UPDATE public.%I SET version = 999 WHERE owner_id = -101', table_name);
    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    IF changed_rows <> 1 THEN RAISE EXCEPTION 'Owner A cannot update their own %', table_name; END IF;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE version = 2', table_name) INTO matching_rows;
    IF matching_rows <> 1 THEN RAISE EXCEPTION 'Version trigger failed for authenticated %', table_name; END IF;
  END LOOP;
END;
$$;

SELECT pg_temp.assert_sqlstate('INSERT INTO projects (owner_id, name) VALUES (-102, ''Stolen project'')', '42501');
SELECT pg_temp.assert_sqlstate('INSERT INTO tasks (owner_id, project_id, title) VALUES (-102, ''22222222-2222-4222-8222-222222222222'', ''Stolen task'')', '42501');
SELECT pg_temp.assert_sqlstate('INSERT INTO notes (owner_id, project_id, title) VALUES (-102, ''22222222-2222-4222-8222-222222222222'', ''Stolen note'')', '42501');
SELECT pg_temp.assert_sqlstate('INSERT INTO attachments (owner_id, task_id, file_name, mime_type, byte_size) VALUES (-102, ''22222222-2222-4222-8222-222222222223'', ''stolen.txt'', ''text/plain'', 1)', '42501');
SELECT pg_temp.assert_sqlstate('INSERT INTO reminders (owner_id, task_id, remind_at) VALUES (-102, ''22222222-2222-4222-8222-222222222223'', now())', '42501');
SELECT pg_temp.assert_sqlstate('INSERT INTO tasks (owner_id, project_id, title) VALUES (-101, ''22222222-2222-4222-8222-222222222222'', ''Mixed owners'')', '23503');
SELECT pg_temp.assert_sqlstate('UPDATE projects SET owner_id = -102 WHERE owner_id = -101', '23514');
SELECT pg_temp.assert_sqlstate('INSERT INTO public.users (auth_id) VALUES (''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'')', '42501');
SELECT pg_temp.assert_sqlstate('UPDATE public.users SET auth_id = ''bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'' WHERE id = -101', '42501');
SELECT pg_temp.assert_sqlstate('DELETE FROM public.users WHERE id = -101', '42501');

-- Legitimate creation and deletion work for each product table.
INSERT INTO projects (id, owner_id, name) VALUES ('11111111-1111-4111-8111-111111111114', -101, 'Own temporary project');
INSERT INTO tasks (id, owner_id, project_id, title) VALUES ('11111111-1111-4111-8111-111111111115', -101, '11111111-1111-4111-8111-111111111114', 'Own temporary task');
INSERT INTO notes (id, owner_id, project_id, title) VALUES ('11111111-1111-4111-8111-111111111116', -101, '11111111-1111-4111-8111-111111111114', 'Own temporary note');
INSERT INTO attachments (owner_id, note_id, file_name, mime_type, byte_size) VALUES (-101, '11111111-1111-4111-8111-111111111116', 'own.txt', 'text/plain', 1);
INSERT INTO reminders (owner_id, task_id, remind_at) VALUES (-101, '11111111-1111-4111-8111-111111111115', now());
DELETE FROM attachments WHERE note_id = '11111111-1111-4111-8111-111111111116';
DELETE FROM reminders WHERE task_id = '11111111-1111-4111-8111-111111111115';
DELETE FROM tasks WHERE id = '11111111-1111-4111-8111-111111111115';
DELETE FROM notes WHERE id = '11111111-1111-4111-8111-111111111116';
DELETE FROM projects WHERE id = '11111111-1111-4111-8111-111111111114';

SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
DO $$
DECLARE table_name text; matching_rows bigint;
BEGIN
  IF (SELECT id FROM public.users) <> -102 THEN RAISE EXCEPTION 'Second owner sees the first identity'; END IF;
  FOREACH table_name IN ARRAY ARRAY['projects', 'tasks', 'notes', 'attachments', 'reminders'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE owner_id = -102 AND version = 1', table_name) INTO matching_rows;
    IF matching_rows <> 1 THEN RAISE EXCEPTION 'Second owner data was exposed or modified in %', table_name; END IF;
  END LOOP;
END;
$$;

-- An authenticated identity with no mapping must still see nothing.
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects) OR EXISTS (SELECT 1 FROM users) THEN
    RAISE EXCEPTION 'Unmapped identity can read data';
  END IF;
END;
$$;

SET LOCAL ROLE anon;
SELECT pg_temp.assert_sqlstate('SELECT * FROM projects', '42501');
SELECT pg_temp.assert_sqlstate('SELECT * FROM public.users', '42501');
SELECT pg_temp.assert_sqlstate('INSERT INTO projects (owner_id, name) VALUES (-101, ''Anonymous'')', '42501');

ROLLBACK;

DO $$
BEGIN
  IF current_user IN ('anon', 'authenticated') OR nullif(current_setting('request.jwt.claims', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Transaction-local identity leaked after rollback';
  END IF;
END;
$$;
