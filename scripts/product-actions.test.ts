import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/pglite";
import {
  ProductInputError,
  readCompleted,
  readNote,
  readProductId,
  readProject,
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
    readProject(
      form({ name: "  Weekend  ", category: "travel", ownerId: "999" }),
    ),
    { name: "Weekend", description: "", category: "travel" },
  );
  for (const values of [
    { name: " ", category: "personal" },
    { name: "a".repeat(121), category: "personal" },
    { name: "Valid", category: "unknown" },
  ])
    assert.throws(() => readProject(form(values)), ProductInputError);
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
    () => readTask(form({ title: "Test", projectId: "../../other" })),
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
  const file = form({ name: "Valid", category: "personal" });
  file.set("name", new Blob(["file"]), "name.txt");
  assert.throws(() => readProject(file), ProductInputError);
});

async function fixture() {
  const pg = new PGlite();
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;`);
  const db = drizzle(pg, { schema });
  // Core CRUD uses 0000–0004; Storage migrations need Supabase's storage schema.
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
  type Tx = Parameters<typeof store.createProject>[0];
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
  return { pg, db, asOwner, ownerA, ownerB };
}

test("owned project/task/note CRUD, task completion, moves, and stale-write protection", async () => {
  const { pg, db, asOwner } = await fixture();
  try {
    const input = {
      name: "Trip",
      description: "Plan",
      category: "travel" as const,
    };
    const projectId = await asOwner(actorA, (tx, owner) =>
      store.createProject(tx, owner, input),
    );
    const secondId = await asOwner(actorA, (tx, owner) =>
      store.createProject(tx, owner, { ...input, name: "Work" }),
    );
    await asOwner(actorA, (tx, owner) =>
      store.updateProject(tx, owner, projectId, 1, {
        ...input,
        name: "Updated trip",
      }),
    );
    await assert.rejects(
      () =>
        asOwner(actorA, (tx, owner) =>
          store.updateProject(tx, owner, projectId, 1, input),
        ),
      /changed/,
    );
    const task = {
      title: "Book train",
      description: "One ticket",
      projectId,
      dueDate: "2026-11-10",
    };
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, task),
    );
    const note = { title: "Plan", content: "Line one\n\nLine two", projectId };
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, note),
    );
    await asOwner(actorA, (tx, owner) =>
      store.updateItem(tx, owner, taskId, 1, {
        ...task,
        title: "Book two tickets",
        projectId: secondId,
      }),
    );
    await asOwner(actorA, (tx, owner) =>
      store.updateItem(tx, owner, noteId, 1, {
        ...note,
        content: "New text",
        projectId: secondId,
      }),
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
    assert.equal(savedTask?.projectId, secondId);
    assert.equal(savedTask?.completed, false);
    assert.equal(savedTask?.version, 4);
    const [savedNote] = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.id, noteId));
    assert.equal(savedNote?.content, "New text");
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

test("project deletion atomically tombstones related items and rejects future writes", async () => {
  const { pg, db, asOwner, ownerA } = await fixture();
  try {
    const projectId = await asOwner(actorA, (tx, owner) =>
      store.createProject(tx, owner, {
        name: "Delete me",
        description: "",
        category: "personal",
      }),
    );
    const keptId = await asOwner(actorA, (tx, owner) =>
      store.createProject(tx, owner, {
        name: "Keep me",
        description: "",
        category: "personal",
      }),
    );
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, {
        title: "Task",
        description: "",
        projectId,
        dueDate: null,
      }),
    );
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, { title: "Note", content: "", projectId }),
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
    // A failed surrounding transaction must leave the entire graph unchanged.
    await assert.rejects(
      () =>
        asOwner(actorA, async (tx, owner) => {
          await store.deleteProduct(tx, owner, "project", projectId, 1);
          throw new Error("rollback");
        }),
      /rollback/,
    );
    assert.equal(
      (
        await db
          .select()
          .from(schema.projects)
          .where(eq(schema.projects.id, projectId))
      )[0]?.deletedAt,
      null,
    );
    assert(
      (await db.select().from(schema.attachments)).every(
        (row) => row.deletedAt === null,
      ),
    );
    await asOwner(actorA, (tx, owner) =>
      store.deleteProduct(tx, owner, "project", projectId, 1),
    );
    for (const table of [
      schema.tasks,
      schema.notes,
      schema.attachments,
      schema.reminders,
    ]) {
      const rows = await db
        .select({ deletedAt: table.deletedAt, version: table.version })
        .from(table);
      assert(rows.length > 0);
      assert(rows.every((row) => row.deletedAt && row.version === 2));
    }
    assert.equal(
      (
        await db
          .select()
          .from(schema.projects)
          .where(eq(schema.projects.id, keptId))
      )[0]?.deletedAt,
      null,
    );
    assert.equal(
      (
        await db
          .select()
          .from(schema.attachments)
          .where(eq(schema.attachments.taskId, taskId))
      )[0]?.storageKey,
      "retained-task-key",
    );
    await assert.rejects(
      () =>
        asOwner(actorA, (tx, owner) =>
          store.createItem(tx, owner, {
            title: "Late task",
            description: "",
            projectId,
            dueDate: null,
          }),
        ),
      /unavailable/,
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

test("another owner cannot read, modify, delete, or attach items to someone else's project", async () => {
  const { pg, db, asOwner, ownerB } = await fixture();
  try {
    const projectId = await asOwner(actorA, (tx, owner) =>
      store.createProject(tx, owner, {
        name: "Private",
        description: "",
        category: "personal",
      }),
    );
    const task = {
      title: "Private task",
      description: "",
      projectId,
      dueDate: null,
    };
    const taskId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, task),
    );
    const note = { title: "Private note", content: "Secret", projectId };
    const noteId = await asOwner(actorA, (tx, owner) =>
      store.createItem(tx, owner, note),
    );
    await asOwner(actorB, async (tx) => {
      assert.deepEqual(await tx.select().from(schema.projects), []);
    });
    for (const operation of [
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.updateProject(tx, owner, projectId, 1, {
          name: "Changed",
          description: "",
          category: "work",
        }),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.createItem(tx, owner, task),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.updateItem(tx, owner, taskId, 1, task),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.updateItem(tx, owner, noteId, 1, note),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.setTaskCompleted(tx, owner, taskId, 1, true),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.deleteProduct(tx, owner, "project", projectId, 1),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.deleteProduct(tx, owner, "task", taskId, 1),
      (tx: Parameters<typeof store.createProject>[0], owner: number) =>
        store.deleteProduct(tx, owner, "note", noteId, 1),
    ])
      await assert.rejects(
        () =>
          asOwner(actorB, async (tx, owner) => {
            await operation(tx, owner);
          }),
        /unavailable/,
      );
    // Even a mistaken owner argument is rejected by the database policies.
    await assert.rejects(() =>
      asOwner(actorA, (tx) =>
        store.createProject(tx, ownerB, {
          name: "Forged owner",
          description: "",
          category: "personal",
        }),
      ),
    );
    const [unchanged] = await db
      .select()
      .from(schema.projects)
      .where(
        and(eq(schema.projects.id, projectId), eq(schema.projects.version, 1)),
      );
    assert(unchanged && !unchanged.deletedAt);
  } finally {
    await pg.close();
  }
});
