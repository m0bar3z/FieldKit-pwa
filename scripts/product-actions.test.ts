import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/pglite";
import {
  ProductInputError,
  readCompleted,
  readNote,
  readProductId,
  readTask,
  readVersion,
} from "../src/lib/product-input";
import * as store from "../src/lib/product-store";
import * as schema from "../src/lib/schema";

const actorA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const actorB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
};

test("product inputs reject malformed fields and ignore submitted ownership", () => {
  assert.deepEqual(
    readTask(
      form({ title: "  First task  ", ownerId: "999", projectId: actorB }),
    ),
    { title: "First task", description: "", dueDate: null },
  );
  assert.deepEqual(
    readNote(
      form({
        title: "  First note  ",
        content: "Text",
        ownerId: "999",
        projectId: actorB,
      }),
    ),
    { title: "First note", content: "Text" },
  );
  for (const title of [" ", "a".repeat(201), "invalid\0title"])
    assert.throws(() => readTask(form({ title })), ProductInputError);
  for (const dueDate of [
    "2026-02-30",
    "2026-13-01",
    "0000-01-01",
    "2026-01-32",
    "2026-1-01",
  ])
    assert.throws(
      () => readTask(form({ title: "Test", projectId: actorA, dueDate })),
      ProductInputError,
    );
  assert.equal(
    readTask(form({ title: "Test", projectId: actorA, dueDate: "2028-02-29" }))
      .dueDate,
    "2028-02-29",
  );
  assert.equal(
    readTask(form({ title: "Test", projectId: actorA })).dueDate,
    null,
  );
  assert.equal(
    readNote(
      form({
        title: "Note",
        content: "  line one\n\nline two  ",
        projectId: actorA,
      }),
    ).content,
    "  line one\n\nline two  ",
  );
  assert.throws(
    () =>
      readNote(
        form({ title: "Note", content: "a".repeat(100001), projectId: actorA }),
      ),
    ProductInputError,
  );
  assert.throws(
    () => readProductId(form({ id: "not-a-uuid" })),
    ProductInputError,
  );
  for (const version of ["0", "-1", "1.5", "01", "2147483648", "1e1", ""])
    assert.throws(() => readVersion(form({ version })), ProductInputError);
  assert.equal(readVersion(form({ version: "12" })), 12);
  assert.equal(readCompleted(form({ completed: "false" })), false);
  assert.throws(
    () => readCompleted(form({ completed: "on" })),
    ProductInputError,
  );
  const file = form({ title: "Valid" });
  file.set("title", new Blob(["file"]), "title.txt");
  assert.throws(() => readTask(file), ProductInputError);
});

async function fixture(applyReduction = true) {
  const pg = new PGlite();
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;`);
  const db = drizzle(pg, { schema });
  // Reuse the existing PostgreSQL fixture; Storage setup is not needed for core CRUD.
  const coreMigrations = readMigrationFiles({
    migrationsFolder: "drizzle",
  }).slice(0, 5);
  for (const migration of coreMigrations)
    await pg.exec(migration.sql.join("\n"));
  await pg.query("INSERT INTO auth.users(id) VALUES ($1), ($2)", [
    actorA,
    actorB,
  ]);
  const owners = await db
    .insert(schema.users)
    .values([{ authId: actorA }, { authId: actorB }])
    .returning();
  const ownerA = Number(owners.find((row) => row.authId === actorA)?.id);
  const ownerB = Number(owners.find((row) => row.authId === actorB)?.id);
  assert(ownerA && ownerB);
  type Tx = Parameters<typeof store.createItem>[0];
  async function asOwner<T>(
    actor: string,
    operation: (tx: Tx, ownerId: number) => Promise<T>,
  ) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: actor, role: "authenticated" })}, true)`,
      );
      await tx.execute(sql`set local role authenticated`);
      // Drivers share the same PostgreSQL query builder; production uses postgres-js.
      return operation(tx as unknown as Tx, actor === actorA ? ownerA : ownerB);
    });
  }
  async function migrateWorkspace() {
    const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
    for (const migration of migrations.slice(6))
      await pg.exec(migration.sql.join("\n"));
  }
  if (applyReduction) await migrateWorkspace();
  return { pg, db, asOwner, ownerA, ownerB, migrateWorkspace };
}

test("existing SQL checks cover the reduced schema and read-only legacy projects", async () => {
  const { pg, db } = await fixture();
  try {
    // The SQL scripts supply their own identities and roll back their test rows.
    await db.delete(schema.users);
    await pg.exec("DELETE FROM auth.users");
    for (const file of ["product-schema.sql", "owner-access.sql"])
      await pg.exec(await readFile(`drizzle/tests/${file}`, "utf8"));
  } finally {
    await pg.close();
  }
});

test("notes and tasks can be created without projects and retain stale-write protection", async () => {
  const { pg, db, asOwner } = await fixture();
  try {
    const task = {
      title: "Book train",
      description: "One ticket",
      dueDate: "2026-11-10",
    };
    const note = { title: "Plan", content: "Line one\n\nLine two" };
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, task),
    );
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, note),
    );
    assert.deepEqual(await db.select().from(schema.projects), []);
    await asOwner(actorA, (tx, owner) =>
      store.updateItem(tx, owner, taskId, 1, {
        ...task,
        title: "Book two tickets",
      }),
    );
    await asOwner(actorA, (tx, owner) =>
      store.updateItem(tx, owner, noteId, 1, { ...note, content: "New text" }),
    );
    await assert.rejects(
      () =>
        asOwner(actorA, (tx, owner) =>
          store.updateItem(tx, owner, noteId, 1, note),
        ),
      /changed/,
    );
    await asOwner(actorA, (tx, owner) =>
      store.setTaskCompleted(tx, owner, taskId, 2, true),
    );
    await assert.rejects(
      () =>
        asOwner(actorA, (tx, owner) =>
          store.setTaskCompleted(tx, owner, taskId, 2, false),
        ),
      /changed/,
    );
    await asOwner(actorA, (tx, owner) =>
      store.setTaskCompleted(tx, owner, taskId, 3, false),
    );
    const [savedTask] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId));
    assert.equal(savedTask?.title, "Book two tickets");
    assert.equal(savedTask?.projectId, null);
    assert.equal(savedTask?.completed, false);
    assert.equal(savedTask?.version, 4);
    const [savedNote] = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.id, noteId));
    assert.equal(savedNote?.content, "New text");
    assert.equal(savedNote?.projectId, null);
    assert.equal(savedNote?.version, 2);
    await asOwner(actorA, (tx, owner) =>
      store.deleteProduct(tx, owner, "task", taskId, 4),
    );
    await asOwner(actorA, (tx, owner) =>
      store.deleteProduct(tx, owner, "note", noteId, 2),
    );
    await assert.rejects(
      () =>
        asOwner(actorA, (tx, owner) =>
          store.updateItem(tx, owner, noteId, 3, note),
        ),
      /unavailable/,
    );
    const [deletedTask] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId));
    assert(deletedTask?.deletedAt);
    assert.equal(deletedTask.version, 5);
  } finally {
    await pg.close();
  }
});

test("deleting an item atomically tombstones its metadata and leaves other items intact", async () => {
  const { pg, db, asOwner, ownerA } = await fixture();
  try {
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, {
        title: "Task",
        description: "",
        dueDate: null,
      }),
    );
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, { title: "Note", content: "" }),
    );
    await db.insert(schema.attachments).values([
      {
        ownerId: ownerA,
        taskId,
        fileName: "task.txt",
        mimeType: "text/plain",
        byteSize: BigInt(5),
        storageKey: "retained-task-key",
      },
      {
        ownerId: ownerA,
        noteId,
        fileName: "note.txt",
        mimeType: "text/plain",
        byteSize: BigInt(5),
      },
    ]);
    await db.insert(schema.reminders).values({
      ownerId: ownerA,
      taskId,
      remindAt: new Date("2026-11-01T12:00:00Z"),
    });
    await assert.rejects(
      () =>
        asOwner(actorA, async (tx, owner) => {
          await store.deleteProduct(tx, owner, "task", taskId, 1);
          throw new Error("rollback");
        }),
      /rollback/,
    );
    assert(
      (await db.select().from(schema.attachments)).every(
        (row) => row.deletedAt === null,
      ),
    );
    await asOwner(actorA, (tx, owner) =>
      store.deleteProduct(tx, owner, "task", taskId, 1),
    );
    const [deletedTask] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId));
    const [deletedAttachment] = await db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.taskId, taskId));
    const [deletedReminder] = await db
      .select()
      .from(schema.reminders)
      .where(eq(schema.reminders.taskId, taskId));
    assert(deletedTask?.deletedAt && deletedTask.version === 2);
    assert(deletedAttachment?.deletedAt && deletedAttachment.version === 2);
    assert.equal(deletedAttachment.storageKey, "retained-task-key");
    assert(deletedReminder?.deletedAt && deletedReminder.version === 2);
    const [keptNote] = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.id, noteId));
    const [keptAttachment] = await db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.noteId, noteId));
    assert.equal(keptNote?.deletedAt, null);
    assert.equal(keptAttachment?.deletedAt, null);
    await asOwner(actorA, (tx, owner) =>
      store.deleteProduct(tx, owner, "note", noteId, 1),
    );
    assert(
      (await db.select().from(schema.attachments)).every(
        (row) => row.deletedAt && row.version === 2,
      ),
    );
    await assert.rejects(
      () =>
        asOwner(actorA, (tx, owner) =>
          store.setTaskCompleted(tx, owner, taskId, 2, true),
        ),
      /unavailable/,
    );
  } finally {
    await pg.close();
  }
});

test("another owner cannot read, modify, delete, or attach files to personal items", async () => {
  const { pg, db, asOwner, ownerB } = await fixture();
  try {
    const task = { title: "Private task", description: "", dueDate: null };
    const note = { title: "Private note", content: "Secret" };
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, task),
    );
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, note),
    );
    await asOwner(actorB, async (tx) => {
      assert.deepEqual(await tx.select().from(schema.tasks), []);
      assert.deepEqual(await tx.select().from(schema.notes), []);
    });
    type Tx = Parameters<typeof store.createItem>[0];
    for (const operation of [
      (tx: Tx, owner: number) => store.updateItem(tx, owner, taskId, 1, task),
      (tx: Tx, owner: number) => store.updateItem(tx, owner, noteId, 1, note),
      (tx: Tx, owner: number) =>
        store.setTaskCompleted(tx, owner, taskId, 1, true),
      (tx: Tx, owner: number) =>
        store.deleteProduct(tx, owner, "task", taskId, 1),
      (tx: Tx, owner: number) =>
        store.deleteProduct(tx, owner, "note", noteId, 1),
      (tx: Tx, owner: number) =>
        store.lockAttachmentParent(tx, owner, "task", taskId),
      (tx: Tx, owner: number) =>
        store.lockAttachmentParent(tx, owner, "note", noteId),
    ])
      await assert.rejects(
        () =>
          asOwner(actorB, async (tx, owner) => {
            await operation(tx, owner);
          }),
        /unavailable/,
      );
    await assert.rejects(() =>
      asOwner(actorA, (tx) => store.createItem(tx, ownerB, task)),
    );
    const [unchanged] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId));
    assert(unchanged && !unchanged.deletedAt && unchanged.version === 1);
  } finally {
    await pg.close();
  }
});

test("workspace migration preserves legacy items and makes projects read-only", async () => {
  const { pg, db, asOwner, ownerA, migrateWorkspace } = await fixture(false);
  try {
    const [project] = await db
      .insert(schema.projects)
      .values({ ownerId: ownerA, name: "Legacy project" })
      .returning();
    assert(project);
    const [task] = await db
      .insert(schema.tasks)
      .values({
        ownerId: ownerA,
        projectId: project.id,
        title: "Existing task",
      })
      .returning();
    const [note] = await db
      .insert(schema.notes)
      .values({
        ownerId: ownerA,
        projectId: project.id,
        title: "Existing note",
        content: "Keep this text",
      })
      .returning();
    assert(task && note);
    await migrateWorkspace();
    await asOwner(actorA, async (tx, owner) => {
      const [legacyTask] = await tx
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, task.id));
      const [legacyNote] = await tx
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.id, note.id));
      assert.equal(legacyTask?.projectId, project.id);
      assert.equal(legacyNote?.content, "Keep this text");
      await store.updateItem(tx, owner, task.id, 1, {
        title: "Still editable",
        description: "",
        dueDate: null,
      });
      await store.updateItem(tx, owner, note.id, 1, {
        title: "Still editable",
        content: "Kept",
      });
      assert.deepEqual(
        await tx.update(schema.projects).set({ name: "Changed" }).returning(),
        [],
      );
      assert.deepEqual(await tx.delete(schema.projects).returning(), []);
    });
    await assert.rejects(() =>
      asOwner(actorA, (tx, owner) =>
        tx
          .insert(schema.projects)
          .values({ ownerId: owner, name: "New project" }),
      ),
    );
    assert.equal(
      (await db.select().from(schema.projects))[0]?.name,
      "Legacy project",
    );
  } finally {
    await pg.close();
  }
});

test("attachment upload policy accepts project-free parents and rejects mismatched or deleted items", async () => {
  const { pg, db, asOwner, ownerA, migrateWorkspace } = await fixture(false);
  try {
    // Exercise the existing Storage policy migration with only the table/helper contract it uses.
    await pg.exec(`CREATE SCHEMA storage;
      CREATE TABLE storage.objects(name text PRIMARY KEY, bucket_id text NOT NULL);
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
        SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
      $$;
      CREATE FUNCTION storage.filename(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
        SELECT reverse(split_part(reverse(name), '/', 1))
      $$;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage TO authenticated;
      GRANT INSERT ON storage.objects TO authenticated;
      CREATE POLICY fieldkit_attachment_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (false);`);
    await migrateWorkspace();
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, {
        title: "Task",
        description: "",
        dueDate: null,
      }),
    );
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, { title: "Note", content: "" }),
    );
    const metadata = await db
      .insert(schema.attachments)
      .values([
        {
          ownerId: ownerA,
          taskId,
          fileName: "task.txt",
          mimeType: "text/plain",
          byteSize: BigInt(5),
        },
        {
          ownerId: ownerA,
          noteId,
          fileName: "note.txt",
          mimeType: "text/plain",
          byteSize: BigInt(5),
        },
      ])
      .returning();
    const taskAttachment = metadata.find((row) => row.taskId === taskId);
    const noteAttachment = metadata.find((row) => row.noteId === noteId);
    assert(taskAttachment && noteAttachment);
    async function upload(actor: string, key: string) {
      return asOwner(actor, (tx) =>
        tx.execute(
          sql`insert into storage.objects(bucket_id, name) values ('fieldkit-attachments', ${key})`,
        ),
      );
    }
    const taskKey = `${actorA}/tasks/${taskId}/${taskAttachment.id}`;
    const noteKey = `${actorA}/notes/${noteId}/${noteAttachment.id}`;
    await upload(actorA, taskKey);
    await upload(actorA, noteKey);
    await assert.rejects(() =>
      upload(actorB, `${actorB}/tasks/${taskId}/${taskAttachment.id}`),
    );
    await assert.rejects(() =>
      upload(actorA, `${actorA}/tasks/${taskId}/${noteAttachment.id}`),
    );
    await assert.rejects(() =>
      upload(actorA, `${actorA}/tasks/${actorB}/${taskAttachment.id}`),
    );
    await pg.query("DELETE FROM storage.objects WHERE name = $1", [taskKey]);
    await db
      .update(schema.attachments)
      .set({ storageKey: taskKey })
      .where(eq(schema.attachments.id, taskAttachment.id));
    await assert.rejects(() => upload(actorA, taskKey));
    await pg.query("DELETE FROM storage.objects WHERE name = $1", [noteKey]);
    await asOwner(actorA, (tx, owner) =>
      store.deleteProduct(tx, owner, "note", noteId, 1),
    );
    await assert.rejects(() => upload(actorA, noteKey));
  } finally {
    await pg.close();
  }
});
