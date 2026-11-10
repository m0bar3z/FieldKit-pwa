import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `export * from './src/lib/products/product-sync/writes';
    export * from './src/lib/products/product-sync/runtime';
    export * from './src/lib/products/product-sync/storage';
    export * from './src/lib/products/product-sync/migration';
    export * from './src/lib/products/product-sync/engine';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  globalName: "syncApi",
  platform: "browser",
  plugins: [
    {
      name: "test-storage",
      setup(plugin) {
        plugin.onResolve({ filter: /indexed-db\/indexed-db$/ }, () => ({
          path: "store",
          namespace: "test",
        }));
        plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `
      export const initializeDB=async()=>{};
      export const getAllFromStore=(store)=>storage.read(store);
      export const findFromStore=(store,key)=>storage.find(store,key);
      export const modifyFromStore=(...args)=>storage.modify(...args);
    `,
        }));
      },
    },
  ],
});
const owner = "fieldkit-demo-user";
const other = "fieldkit-second-demo-user";
const note = {
  id: crypto.randomUUID(),
  userId: owner,
  title: "Original",
  content: "Original text",
  excerpt: "Original text",
  version: 3,
  updated: 100,
  attachments: [],
};
const payload = { title: "Offline note", content: "First line\n\nLast line" };
function namedLocks() {
  const tails = new Map();
  return {
    request(name, fn) {
      const next = (tails.get(name) ?? Promise.resolve()).then(fn);
      tails.set(
        name,
        next.catch(() => {}),
      );
      return next;
    },
  };
}
function engine({
  stores = { tasks: new Map(), notes: new Map() },
  online = false,
  fetch: custom,
  locks,
} = {}) {
  const state = {
    stores,
    online,
    userId: owner,
    requests: [],
    timers: new Map(),
    now: 1000,
    warnings: [],
    receipts: new Map(),
    server: { tasks: new Map(), notes: new Map() },
  };
  const window = new EventTarget();
  const context = vm.createContext({
    console: { warn: (...args) => state.warnings.push(args) },
    window,
    crypto,
    Event,
    Headers,
    Response,
    URL,
    URLSearchParams,
    AbortSignal,
    DOMException,
    TypeError,
    Intl,
    Date: class extends Date {
      static now() {
        return state.now;
      }
    },
    navigator: {
      ...(locks ? { locks } : {}),
      get onLine() {
        return state.online;
      },
    },
    setTimeout(fn, delay) {
      const id = crypto.randomUUID();
      state.timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout(id) {
      state.timers.delete(id);
    },
    storage: {
      async read(store) {
        return structuredClone([...stores[store].values()]);
      },
      async find(store, key) {
        return structuredClone(stores[store].get(key));
      },
      async modify(store, key, fn) {
        const next = fn(structuredClone(stores[store].get(key)));
        if (next) stores[store].set(key, structuredClone(next));
        else stores[store].delete(key);
        return structuredClone(next);
      },
    },
    async fetch(url, options) {
      if (url === "/api/auth/session")
        return state.userId
          ? Response.json({ user: { id: state.userId } })
          : Response.json({ error: "Sign in" }, { status: 401 });
      const request = {
        url,
        method: options.method ?? "GET",
        body: options.body ? JSON.parse(options.body) : undefined,
        userId: new Headers(options.headers).get("X-FieldKit-User"),
      };
      state.requests.push(request);
      if (custom) return custom(request, state);
      const parts = url.split("/");
      const kind = parts[2];
      const id = parts[3];
      const records = state.server[kind];
      if (request.method === "GET") {
        const item = records.get(id);
        return item
          ? Response.json(item)
          : Response.json({ error: "Removed" }, { status: 404 });
      }
      if (request.userId !== state.userId)
        return Response.json({ error: "Account changed" }, { status: 401 });
      const key = `${kind}:${request.body.mutationId}`;
      if (state.receipts.has(key))
        return Response.json({ item: state.receipts.get(key) });
      const current = records.get(id);
      if (request.method !== "POST" && !current)
        return Response.json({ error: "Removed" }, { status: 404 });
      if (current && current.version !== Number(request.body.version))
        return Response.json({ error: "Changed" }, { status: 409 });
      const item = {
        ...current,
        ...request.body,
        id: current?.id ?? crypto.randomUUID(),
        userId: state.userId,
        version: (current?.version ?? 0) + 1,
        updatedAt: state.now,
        createdAt: current?.createdAt ?? state.now,
        completed: request.body.completed ?? false,
        deletedAt: request.method === "DELETE" ? state.now : null,
      };
      if (request.method === "DELETE") records.delete(id);
      else records.set(item.id, structuredClone(item));
      state.receipts.set(key, structuredClone(item));
      return Response.json({ item });
    },
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  return { api: context.syncApi, state, window };
}
async function until(fn) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise((r) => setImmediate(r));
  }
  assert.fail("State did not settle");
}
const notesList = (items = []) => ({ userId: owner, items, timeZone: "UTC" });

test("offline task reminders survive creation, editing, reload, completion, and acknowledgement", async () => {
  const first = engine();
  const reminderAt = 2000000000000;
  await first.api.saveTask(owner, {
    title: "Reminder",
    description: "",
    dueDate: "",
    reminderAt,
  });
  const reload = engine({ stores: first.state.stores });
  let item = (await reload.api.loadLocalTasks(owner)).items[0];
  assert.equal(item.reminderAt, reminderAt);
  await reload.api.saveTask(
    owner,
    {
      title: item.title,
      description: "Edited",
      dueDate: "",
      reminderAt: reminderAt + 60000,
    },
    item,
  );
  item = (await reload.api.loadLocalTasks(owner)).items[0];
  await reload.api.setTaskCompletion(owner, item, true);
  item = (await reload.api.loadLocalTasks(owner)).items[0];
  assert.equal(item.reminderAt, reminderAt + 60000);
  assert.equal(item.completed, true);
  reload.state.online = true;
  await reload.api.syncProducts(true, owner);
  assert.equal(reload.state.requests[0].body.reminderAt, reminderAt + 60000);
  assert.equal(
    (await reload.api.loadLocalTasks(owner)).items[0].reminderAt,
    reminderAt + 60000,
  );
});

test("removing a reminder offline stays null after syncing, and task deletion retains its tombstone", async () => {
  const { api, state } = engine();
  await api.saveTask(owner, {
    title: "Remove",
    description: "",
    dueDate: "",
    reminderAt: 2000000000000,
  });
  state.online = true;
  await api.syncProducts(true, owner);
  state.online = false;
  let item = (await api.loadLocalTasks(owner)).items[0];
  await api.saveTask(
    owner,
    { title: item.title, description: "", dueDate: "", reminderAt: null },
    item,
  );
  assert.equal((await api.loadLocalTasks(owner)).items[0].reminderAt, null);
  state.online = true;
  await api.syncProducts(true, owner);
  item = (await api.loadLocalTasks(owner)).items[0];
  assert.equal(item.reminderAt, null);
  state.online = false;
  await api.deleteTask(owner, item);
  assert.equal((await api.loadLocalTasks(owner)).items.length, 0);
  state.online = true;
  await api.syncProducts(true, owner);
  assert.equal(state.requests.at(-1).method, "DELETE");
});

test("adding a reminder during a legacy immutable upload never changes its original request", async () => {
  const { api, state } = engine();
  await api.saveTask(owner, { title: "Legacy", description: "", dueDate: "" });
  const item = (await api.loadLocalTasks(owner)).items[0];
  const attempt = await api.prepareAttempt("task", item.id, owner);
  assert.equal(Object.hasOwn(attempt.payload, "reminderAt"), false);
  await api.saveTask(
    owner,
    {
      title: item.title,
      description: "",
      dueDate: "",
      reminderAt: 2000000000000,
    },
    item,
  );
  const pending = (await api.readChanges(owner, "task"))[0].value;
  assert.equal(pending.attempt.mutationId, attempt.mutationId);
  assert.equal(Object.hasOwn(pending.attempt.payload, "reminderAt"), false);
  state.online = true;
  await api.syncProducts(true, owner);
  await api.syncProducts(true, owner);
  assert.equal(Object.hasOwn(state.requests[0].body, "reminderAt"), false);
  assert.equal(state.requests[1].body.reminderAt, 2000000000000);
});

test("new offline notes can be read, edited before upload, reloaded, and synchronized once", async () => {
  const first = engine();
  await first.api.saveNote(owner, payload);
  let item = (await first.api.loadLocalNotes(owner)).items[0];
  assert.equal(item.localOnly, true);
  await first.api.saveNote(owner, { ...payload, title: "Latest" }, item);
  const reload = engine({ stores: first.state.stores });
  item = (await reload.api.loadLocalNotes(owner)).items[0];
  assert.equal(item.title, "Latest");
  assert.equal(item.content, payload.content);
  reload.state.online = true;
  await reload.api.syncProducts(true, owner);
  assert.equal(reload.state.requests.length, 1);
  assert.equal(reload.state.requests[0].method, "POST");
  const synced = (await reload.api.loadLocalNotes(owner)).items[0];
  assert.equal(synced.localId, item.id);
  assert.notEqual(synced.id, item.id);
  assert.equal(synced.localOnly, undefined);
  assert.equal(
    (await reload.api.mergeLocalNotes(notesList([synced]))).items.length,
    1,
  );
});

test("offline note deletion hides cached content after reload and syncs a persistent tombstone", async () => {
  const first = engine();
  await first.api.mergeLocalNotes(notesList([note]));
  await first.api.deleteNote(owner, note);
  assert.equal((await first.api.loadLocalNotes(owner)).items.length, 0);
  const reload = engine({ stores: first.state.stores, online: true });
  reload.state.server.notes.set(note.id, { ...note, updatedAt: 100 });
  await reload.api.syncProducts(true, owner);
  assert.equal(reload.state.requests[0].method, "DELETE");
  assert.equal(
    (await reload.api.mergeLocalNotes(notesList([note]))).items.length,
    0,
  );
  assert.equal((await reload.api.loadLocalNotes(owner)).pendingDeletions, 0);
});

test("deleting an unattempted note cancels creation without network traffic", async () => {
  const { api, state } = engine();
  await api.saveNote(owner, payload);
  const item = (await api.loadLocalNotes(owner)).items[0];
  await api.deleteNote(owner, item);
  state.online = true;
  await api.syncProducts(true, owner);
  assert.equal(state.requests.length, 0);
  assert.equal((await api.loadLocalNotes(owner)).items.length, 0);
});

for (const deletion of [false, true])
  test(`${deletion ? "deletion" : "editing"} during note creation uses the acknowledged server identity`, async () => {
    let release;
    const { api, state } = engine({
      fetch(request) {
        if (request.method === "POST")
          return new Promise((resolve) => {
            release = () =>
              resolve(
                Response.json({
                  item: {
                    ...note,
                    ...request.body,
                    id: note.id,
                    version: 1,
                    updatedAt: 1000,
                  },
                }),
              );
          });
        return Response.json({
          item: { ...note, ...request.body, version: 2, updatedAt: 2000 },
        });
      },
    });
    await api.saveNote(owner, payload);
    const local = (await api.loadLocalNotes(owner)).items[0];
    state.online = true;
    const syncing = api.syncProducts(true, owner);
    await until(() => !!release);
    if (deletion) await api.deleteNote(owner, local);
    else
      await api.saveNote(
        owner,
        { ...payload, content: "Edited during creation" },
        local,
      );
    release();
    await syncing;
    assert.equal(state.requests.length, 2);
    assert.equal(state.requests[1].method, deletion ? "DELETE" : "PATCH");
    assert.equal(state.requests[1].url, `/api/notes/${note.id}`);
    assert.equal(state.requests[1].body.version, "1");
    if (deletion)
      assert.equal((await api.loadLocalNotes(owner)).items.length, 0);
    else
      assert.equal(
        (await api.loadLocalNotes(owner)).items[0].content,
        "Edited during creation",
      );
  });

test("lost creation responses retry one immutable note mutation after reload", async () => {
  const first = engine({
    fetch() {
      throw new TypeError("Response lost");
    },
  });
  await first.api.saveNote(owner, payload);
  first.state.online = true;
  await first.api.syncProducts(true, owner);
  const reload = engine({ stores: first.state.stores, online: true });
  await reload.api.syncProducts(true, owner);
  assert.deepEqual(reload.state.requests[0].body, first.state.requests[0].body);
});

test("failed note deletions reappear for retry or keeping the note", async () => {
  const { api, state } = engine({
    fetch() {
      return Response.json({ error: "Changed" }, { status: 409 });
    },
  });
  await api.mergeLocalNotes(notesList([note]));
  await api.deleteNote(owner, note);
  state.online = true;
  await api.syncProducts(true, owner);
  const failed = (await api.loadLocalNotes(owner)).items[0];
  assert.equal(failed.deletionPending, true);
  assert.equal(failed.syncStatus, "failed");
  await api.discardProduct("note", failed.localId ?? failed.id, owner);
  assert.equal(
    (await api.loadLocalNotes(owner)).items[0].deletionPending,
    undefined,
  );
});

test("one processor handles both kinds and a failed note does not block tasks", async () => {
  const { api, state } = engine();
  await api.saveNote(owner, payload);
  await api.saveTask(owner, {
    title: "Task",
    description: "Description",
    dueDate: "",
  });
  state.online = true;
  await api.syncProducts(true, owner);
  assert.equal(state.requests.length, 2);
  assert.deepEqual(state.requests.map((r) => r.url).sort(), [
    "/api/notes",
    "/api/tasks",
  ]);
  assert.equal((await api.loadLocalNotes(owner)).items.length, 1);
  assert.equal((await api.loadLocalTasks(owner)).items.length, 1);
  const failed = engine({
    fetch(r) {
      return r.url === "/api/notes"
        ? Response.json({ error: "Invalid" }, { status: 400 })
        : Response.json({
            item: {
              id: crypto.randomUUID(),
              userId: owner,
              version: 1,
              updatedAt: 1000,
              completed: false,
            },
          });
    },
  });
  await failed.api.saveNote(owner, payload);
  await failed.api.saveTask(owner, {
    title: "Task",
    description: "",
    dueDate: "",
  });
  failed.state.online = true;
  await failed.api.syncProducts(true, owner);
  assert.equal(
    (await failed.api.loadLocalNotes(owner)).items[0].syncStatus,
    "failed",
  );
  assert.equal(
    (await failed.api.loadLocalTasks(owner)).items[0].syncStatus,
    undefined,
  );
});

test("owner isolation applies to local reads, mutations, retry/discard, and uploads", async () => {
  const { api, state } = engine();
  await api.saveNote(owner, payload);
  const local = (await api.loadLocalNotes(owner)).items[0];
  assert.equal((await api.loadLocalNotes(other)).items.length, 0);
  await assert.rejects(api.saveNote(other, payload, local), /another account/);
  await assert.rejects(api.deleteNote(other, local), /another account/);
  await api.discardProduct("note", local.id, other);
  assert.equal((await api.loadLocalNotes(owner)).items.length, 1);
  state.userId = other;
  state.online = true;
  await assert.rejects(api.syncProducts(true, owner), /account changed/);
  assert.equal(state.requests.length, 0);
});

test("page runtimes share one upload lock across notes and tasks", async () => {
  const locks = namedLocks();
  const first = engine({ locks });
  await first.api.saveNote(owner, payload);
  await first.api.saveTask(owner, {
    title: "Task",
    description: "",
    dueDate: "",
  });
  const second = engine({ stores: first.state.stores, online: true, locks });
  first.state.online = true;
  await Promise.all([
    first.api.syncProducts(true, owner),
    second.api.syncProducts(true, owner),
  ]);
  assert.equal(first.state.requests.length + second.state.requests.length, 2);
});

test("switching accounts stops new requests from an in-flight queue", async () => {
  let release;
  const { api, state } = engine({
    fetch(r) {
      return new Promise((resolve) => {
        release = () =>
          resolve(
            Response.json({
              item: { ...note, ...r.body, version: 1, updatedAt: 1000 },
            }),
          );
      });
    },
  });
  await api.saveNote(owner, payload);
  state.now = 2000;
  await api.saveTask(owner, { title: "Task", description: "", dueDate: "" });
  state.online = true;
  const stop = api.startProductSync(owner);
  await until(() => !!release);
  stop();
  state.userId = other;
  const stopOther = api.startProductSync(other);
  release();
  await until(
    () => state.stores.notes.values().next().value.value.status === "synced",
  );
  await api.syncProducts(true, other);
  assert.equal(state.requests.length, 1);
  stopOther();
  assert.equal(state.timers.size, 0);
});

test("session failures back off and subscription cleanup removes retry timers", async () => {
  const { api, state } = engine();
  await api.saveNote(owner, payload);
  state.userId = null;
  state.online = true;
  const stop = api.startProductSync(owner);
  await until(() => state.timers.size > 0);
  for (let i = 0; i < 3; i++) {
    const { fn } = [...state.timers.values()][0];
    state.timers.clear();
    fn();
    await until(() => state.timers.size > 0);
  }
  assert.ok([...state.timers.values()][0].delay >= 4000);
  stop();
  assert.equal(state.timers.size, 0);
});

function legacyNote(attempt = null) {
  return {
    id: note.id,
    createdAt: 50,
    value: {
      kind: "note",
      action: "UPDATE",
      recordType: "pending-change",
      note: { ...note },
      payload: { title: "Latest desired", content: "Keep this text" },
      revision: 2,
      status: "pending",
      attempt,
      attempts: 2,
      nextAttemptAt: 4000,
      updatedAt: 3000,
      error: "Waiting",
    },
  };
}
test("migration preserves numeric note creations, owners, aliases, whitespace, and unknown records", () => {
  const { api } = engine();
  const original = {
    id: 7,
    createdAt: 100,
    value: {
      kind: "note",
      action: "CREATE",
      payload: { kind: "note", ...payload },
    },
  };
  const migrated = api.migrateRecord("notes", original);
  assert.match(migrated.id, /^[a-f0-9-]{36}$/);
  assert.equal(migrated.value.userId, owner);
  assert.equal(migrated.value.note.legacyId, "7");
  assert.equal(migrated.value.note.version, 1);
  assert.equal(migrated.value.payload.content, payload.content);
  assert.equal(api.migrateRecord("notes", migrated), migrated);
  const owned = api.migrateRecord("notes", {
    ...original,
    value: { ...original.value, userId: other },
  });
  assert.equal(owned.value.userId, other);
  const unknown = { id: 4, createdAt: 1, value: { unrecognized: "keep" } };
  assert.equal(api.migrateRecord("notes", unknown), unknown);
});

test("unrecognized versioned data stays out of the upload queue", async () => {
  const { api, state } = engine();
  const unknown = {
    id: crypto.randomUUID(),
    createdAt: 1,
    value: {
      syncVersion: 6,
      kind: "note",
      userId: owner,
      status: "pending",
      unrecognized: "preserve",
    },
  };
  state.stores.notes.set(unknown.id, unknown);
  state.online = true;
  await api.syncProducts(true, owner);
  assert.equal(state.requests.length, 0);
  assert.deepEqual(state.stores.notes.get(unknown.id), unknown);
});

test("migration preserves old edits, synced records, snapshots, and immutable task attempts", () => {
  const { api } = engine();
  const attempt = {
    revision: 1,
    version: 3,
    payload: { title: "Submitted", content: "Submitted text" },
  };
  const old = legacyNote(attempt);
  delete old.value.note.userId;
  const migrated = api.migrateRecord("notes", old);
  assert.equal(migrated.value.userId, owner);
  assert.equal(migrated.value.attempt.legacy, true);
  assert.equal(migrated.value.attempt.payload.content, "Submitted text");
  assert.equal(migrated.value.payload.content, "Keep this text");
  assert.equal(migrated.value.attempt.revision, 1);
  assert.equal(migrated.value.revision, 2);
  assert.equal(migrated.value.attempts, 2);
  assert.equal(migrated.value.nextAttemptAt, 4000);
  const synced = legacyNote();
  synced.value.status = "synced";
  synced.value.recordType = "synced-item";
  assert.equal(api.migrateRecord("notes", synced).value.status, "synced");
  const snapshot = {
    id: `snapshot:${owner}`,
    createdAt: 5,
    value: notesList([note]),
  };
  assert.equal(
    api.migrateRecord("notes", snapshot).value.data.items[0].content,
    note.content,
  );
  const taskItem = {
    id: crypto.randomUUID(),
    userId: owner,
    title: "Task",
    description: "",
    dueDate: "",
    completed: false,
    group: "unscheduled",
    reminderAt: null,
    updated: 100,
    version: 2,
    attachments: [],
  };
  const oldTask = {
    ...legacyNote(),
    id: taskItem.id,
    value: {
      ...legacyNote().value,
      kind: "task",
      userId: owner,
      task: taskItem,
      payload: { title: "Task", description: "", dueDate: "", completed: true },
      confirmed: false,
      attempt: {
        mutationId: crypto.randomUUID(),
        taskId: taskItem.id,
        action: "UPDATE",
        revision: 1,
        version: 2,
        payload: {
          title: "Task",
          description: "",
          dueDate: "",
          completed: true,
        },
      },
    },
  };
  const migratedTask = api.migrateRecord("tasks", oldTask);
  assert.equal(
    migratedTask.value.attempt.mutationId,
    oldTask.value.attempt.mutationId,
  );
  assert.equal(migratedTask.value.attempt.itemId, taskItem.id);
  assert.equal(migratedTask.value.payload.completed, true);
});

for (const alreadySaved of [true, false])
  test(`legacy note attempt reconciles ${alreadySaved ? "an acknowledged lost response" : "an unsent baseline"} before newer edits`, async () => {
    const { api, state } = engine();
    const attempt = {
      revision: 1,
      version: 3,
      payload: { title: "Submitted", content: "Submitted text" },
    };
    const migrated = api.migrateRecord("notes", legacyNote(attempt));
    state.stores.notes.set(migrated.id, migrated);
    state.server.notes.set(note.id, {
      ...note,
      ...(alreadySaved ? attempt.payload : {}),
      version: alreadySaved ? 4 : 3,
      updatedAt: 1000,
    });
    state.online = true;
    await api.syncProducts(true, owner);
    assert.equal(state.requests[0].method, "GET");
    const writes = state.requests.filter((r) => r.method === "PATCH");
    assert.equal(writes.length, alreadySaved ? 1 : 2);
    assert.equal(writes.at(-1).body.content, "Keep this text");
    assert.equal(
      (await api.loadLocalNotes(owner)).items[0].syncStatus,
      undefined,
    );
  });

test("ambiguous legacy note updates preserve local text as a conflict without uploading", async () => {
  const { api, state } = engine();
  const migrated = api.migrateRecord(
    "notes",
    legacyNote({
      revision: 1,
      version: 3,
      payload: { title: "Submitted", content: "Submitted text" },
    }),
  );
  state.stores.notes.set(migrated.id, migrated);
  state.server.notes.set(note.id, { ...note, version: 6, updatedAt: 5000 });
  state.online = true;
  await api.syncProducts(true, owner);
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0].method, "GET");
  const local = (await api.loadLocalNotes(owner)).items[0];
  assert.equal(local.content, "Keep this text");
  assert.equal(local.syncStatus, "failed");
});
