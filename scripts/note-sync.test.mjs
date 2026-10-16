import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `export { saveItem } from './src/lib/products/save-item';
      export * from './src/lib/products/note-sync';
      export { applyNoteEdits } from './src/lib/products/note-edits';`,
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
      name: "isolated-storage",
      setup(plugin) {
        plugin.onResolve({ filter: /indexed-db\/indexed-db$/ }, () => ({
          path: "storage",
          namespace: "test",
        }));
        plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `
        export const getAllFromStore = () => storage.read();
        export const modifyFromStore = (...args) => storage.modify(...args);
      `,
        }));
      },
    },
  ],
});

const originalNote = {
  id: "6e2fd9b3-ce5d-4832-a5cc-271cb399aa18",
  title: "Original",
  content: "Original content",
  excerpt: "Original content",
  version: 1,
  updated: 100,
  attachments: [],
};

function engine({ records = new Map(), online = false, fetch: fetcher } = {}) {
  const state = {
    online,
    now: 1000,
    records,
    requests: [],
    timers: new Map(),
    nextTimer: 0,
  };
  const window = new EventTarget();
  const context = vm.createContext({
    console,
    window,
    Event,
    Headers,
    Response,
    AbortSignal,
    DOMException,
    TypeError,
    navigator: {
      get onLine() {
        return state.online;
      },
    },
    Date: class extends Date {
      static now() {
        return state.now;
      }
    },
    setTimeout(callback, delay) {
      const id = ++state.nextTimer;
      state.timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      state.timers.delete(id);
    },
    storage: {
      async read() {
        return structuredClone([...records.values()]);
      },
      async modify(_store, key, change) {
        const value = change(structuredClone(records.get(key)));
        if (value) records.set(key, structuredClone(value));
        else records.delete(key);
        return structuredClone(value);
      },
    },
    async fetch(url, options) {
      const request = {
        url,
        key: options.headers.get("Idempotency-Key"),
        body: JSON.parse(options.body),
      };
      state.requests.push(request);
      return fetcher
        ? fetcher(request, state)
        : Response.json({
            item: {
              ...originalNote,
              ...request.body,
              version: Number(request.body.version) + 1,
              updatedAt: state.now,
            },
          });
    },
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  return {
    state,
    window,
    api: context.syncApi,
    edit: () => records.get(originalNote.id)?.value,
  };
}

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail("Expected the synchronization state to settle");
}

test("offline edits are durable, coalesce, and overlay cached notes without duplicates", async () => {
  const { state, api, edit } = engine();
  state.records.set(1, {
    id: 1,
    createdAt: 1,
    value: { kind: "task", action: "CREATE" },
  });
  await api.saveItem(originalNote, { title: "First", content: "First edit" });
  await api.saveItem(originalNote, { title: "Latest", content: "Latest edit" });
  assert.equal(state.requests.length, 0);
  assert.equal(state.records.size, 2);
  assert.equal(edit().note.version, 1);
  assert.equal(edit().revision, 2);
  const notes = api.applyNoteEdits([originalNote], await api.readNoteEdits());
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, "Latest");
  assert.equal(notes[0].syncStatus, "pending");
  assert.equal(state.records.get(1).value.kind, "task");
});

test("a lost response retries the same immutable request and persists acknowledgement", async () => {
  let acknowledged;
  const first = engine({
    online: true,
    fetch(request, state) {
      if (!acknowledged) {
        acknowledged = {
          ...originalNote,
          ...request.body,
          version: 2,
          updatedAt: state.now,
        };
        throw new TypeError("Connection closed after the server committed");
      }
      return Response.json({ item: acknowledged });
    },
  });
  await first.api.saveItem(originalNote, {
    title: "Offline edit",
    content: "Saved content",
  });
  await until(() => first.edit()?.attempts === 1);
  await first.api.syncPendingChanges();
  const key = first.state.requests[0].key;
  assert.equal(first.edit().nextAttemptAt, 2000);
  // A fresh runner shares only the persisted database, as after an app reload.
  const restored = engine({
    records: first.state.records,
    online: true,
    fetch: (request) => {
      assert.equal(request.key, key);
      assert.equal(request.body.version, "1");
      return Response.json({ item: acknowledged });
    },
  });
  await restored.api.syncPendingChanges(true);
  assert.equal(restored.edit().status, "synced");
  assert.equal(restored.edit().recordType, "synced-item");
  const projected = restored.api.applyNoteEdits(
    [originalNote],
    await restored.api.readNoteEdits(),
  );
  assert.equal(projected[0].title, "Offline edit");
  assert.equal(projected[0].version, 2);
  assert.equal(projected[0].syncStatus, undefined);
  const newer = { ...originalNote, title: "Newer server edit", version: 3 };
  assert.equal(
    restored.api.applyNoteEdits([newer], await restored.api.readNoteEdits())[0]
      .title,
    "Newer server edit",
  );
});

test("an edit made during a request is sent afterwards with the acknowledged version", async () => {
  let finishFirst;
  const { state, api, edit } = engine({
    online: true,
    fetch(request) {
      if (request.body.title === "First")
        return new Promise((resolve) => {
          finishFirst = () =>
            resolve(
              Response.json({
                item: {
                  ...originalNote,
                  ...request.body,
                  version: 2,
                  updatedAt: 1100,
                },
              }),
            );
        });
      return Response.json({
        item: { ...originalNote, ...request.body, version: 3, updatedAt: 1200 },
      });
    },
  });
  await api.saveItem(originalNote, { title: "First", content: "One" });
  await until(() => !!finishFirst);
  await api.saveItem(originalNote, { title: "Second", content: "Two" });
  assert.equal(state.requests.length, 1);
  const one = api.syncPendingChanges();
  assert.equal(one, api.syncPendingChanges());
  finishFirst();
  await one;
  assert.deepEqual(
    state.requests.map((request) => request.body.version),
    ["1", "2"],
  );
  assert.notEqual(state.requests[0].key, state.requests[1].key);
  assert.equal(edit().status, "synced");
  assert.equal(edit().payload.title, "Second");
  assert.equal(edit().note.version, 3);
});

test("server failures back off instead of repeatedly retrying immediately", async () => {
  const { state, api, edit } = engine({
    online: true,
    fetch: () =>
      Response.json({ error: "Temporarily unavailable" }, { status: 503 }),
  });
  const stop = api.startNoteSync();
  await api.saveItem(originalNote, { title: "Retry", content: "Keep me" });
  await until(() => edit()?.attempts === 1);
  await api.syncPendingChanges();
  assert.equal(state.requests.length, 1);
  assert.equal(edit().nextAttemptAt, 2000);
  state.now = 2000;
  await api.syncPendingChanges();
  assert.equal(state.requests.length, 2);
  assert.equal(edit().nextAttemptAt, 4000);
  assert.equal(edit().status, "pending");
  stop();
  assert.equal(state.timers.size, 0);
});

for (const status of [400, 401, 409, 422]) {
  test(`HTTP ${status} preserves the edit for attention without automatic retries`, async () => {
    const { state, api, edit } = engine({
      online: true,
      fetch: () => Response.json({ error: "Review this change" }, { status }),
    });
    await api.saveItem(originalNote, {
      title: "Keep this draft",
      content: "My work",
    });
    await until(() => edit()?.status === "failed");
    await api.syncPendingChanges(true);
    assert.equal(state.requests.length, 1);
    assert.equal(edit().error, "Review this change");
    assert.equal(edit().payload.content, "My work");
    await api.discardNoteEdit(originalNote.id);
    assert.equal(state.records.size, 0);
  });
}

test("startup and reconnection synchronize saved edits; manual retry can recover authentication", async () => {
  let authenticated = false;
  const { state, window, api, edit } = engine({
    fetch(request) {
      return authenticated
        ? Response.json({
            item: {
              ...originalNote,
              ...request.body,
              version: 2,
              updatedAt: 1500,
            },
          })
        : Response.json({ error: "Sign in to continue" }, { status: 401 });
    },
  });
  await api.saveItem(originalNote, { title: "Queued", content: "Edit" });
  const stop = api.startNoteSync();
  state.online = true;
  window.dispatchEvent(new Event("online"));
  await until(() => edit()?.status === "failed");
  await api.syncPendingChanges();
  authenticated = true;
  await api.retryNoteEdit(originalNote.id);
  assert.equal(edit().status, "synced");
  assert.equal(state.requests.length, 2);
  stop();
});

test("server update receipts make repeated requests idempotent without bypassing conflicts", () => {
  const require = createRequire(import.meta.url);
  const {
    createNote,
    updateNote,
    getNote,
  } = require("../src/lib/products/store.ts");
  const note = createNote({ title: "Server note", content: "Original" });
  const input = { title: "Edited", content: "New content" };
  assert.equal(updateNote(note.id, 1, input, "operation-1").version, 2);
  assert.equal(updateNote(note.id, 1, input, "operation-1").version, 2);
  assert.equal(getNote(note.id).version, 2);
  updateNote(
    note.id,
    2,
    { title: "Later", content: "Later edit" },
    "operation-2",
  );
  assert.equal(updateNote(note.id, 1, input, "operation-1").version, 2);
  assert.equal(getNote(note.id).version, 3);
  assert.throws(
    () =>
      updateNote(
        note.id,
        1,
        { title: "Different", content: "" },
        "operation-1",
      ),
    (error) => error.status === 409,
  );
  assert.throws(
    () => updateNote(note.id, 1, input, "new-operation"),
    (error) => error.status === 409,
  );
});
