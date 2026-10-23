import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const storagePlugin = {
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
};

const bundle = await build({
  stdin: {
    contents: `export { saveItem } from './src/lib/products/save-item';
      export * from './src/lib/products/note-sync';
      export { requestNoteBackgroundSync } from './src/lib/products/note-sync/background-sync';
      export { applyNoteEdits } from './src/lib/products/note-edits';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  globalName: "syncApi",
  platform: "browser",
  plugins: [storagePlugin],
});

const workerBundle = await build({
  entryPoints: ["src/app/sw.ts"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  plugins: [
    storagePlugin,
    {
      name: "isolated-caching",
      setup(plugin) {
        plugin.onResolve(
          { filter: /^(serwist|@serwist\/turbopack\/worker)$/ },
          () => ({ path: "caching", namespace: "cache-test" }),
        );
        plugin.onLoad({ filter: /.*/, namespace: "cache-test" }, () => ({
          contents: `export const defaultCache = [];
            export class Serwist { constructor(options) { self.serwistOptions = options; } addEventListeners() {} }
            export class ExpirationPlugin {}
            export class NetworkFirst { constructor(options) { this.options = options; } }
            export class NetworkOnly {}`,
        }));
      },
    },
  ],
});

const originalNote = {
  id: "6e2fd9b3-ce5d-4832-a5cc-271cb399aa18",
  userId: "fieldkit-demo-user",
  title: "Original",
  content: "Original content",
  excerpt: "Original content",
  version: 1,
  updated: 100,
  attachments: [],
};

function engine({
  records = new Map(),
  online = false,
  fetch: fetcher,
  runtime = "page",
  serviceWorker,
  locks,
  openClients = true,
  badging = {},
  userId = "fieldkit-demo-user",
} = {}) {
  const state = {
    online,
    userId,
    now: 1000,
    records,
    requests: [],
    timers: new Map(),
    nextTimer: 0,
    messages: [],
    warnings: [],
  };
  const window = new EventTarget();
  const worker = new EventTarget();
  worker.clients = {
    async matchAll() {
      return openClients
        ? [{ postMessage: (message) => state.messages.push(message) }]
        : [];
    },
  };
  const context = vm.createContext({
    console: { ...console, warn: (...args) => state.warnings.push(args) },
    ...(runtime === "page" ? { window } : { self: worker }),
    Event,
    Headers,
    Response,
    AbortSignal,
    DOMException,
    TypeError,
    URLSearchParams,
    URL,
    navigator: {
      ...badging,
      ...(serviceWorker ? { serviceWorker } : {}),
      ...(locks ? { locks } : {}),
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
      if (url === "/api/auth/session")
        return state.userId
          ? Response.json({
              user: { id: state.userId, email: `${state.userId}@example.com` },
            })
          : Response.json({ error: "Sign in" }, { status: 401 });
      const request = {
        url,
        body: options.body ? JSON.parse(options.body) : undefined,
        credentials: options.credentials,
        method: options.method ?? "GET",
        expectedUserId: new Headers(options.headers).get("X-FieldKit-User"),
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
  vm.runInContext(
    (runtime === "page" ? bundle : workerBundle).outputFiles[0].text,
    context,
  );
  return {
    state,
    window,
    caching: worker.serwistOptions?.runtimeCaching,
    api: context.syncApi,
    edit: () => records.get(originalNote.id)?.value,
    backgroundSync(tag = "fieldkit-note-edits") {
      const event = new Event("sync");
      let task;
      Object.assign(event, {
        tag,
        waitUntil(promise) {
          task = promise;
        },
      });
      worker.dispatchEvent(event);
      return task;
    },
  };
}

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail("Expected the synchronization state to settle");
}

function backgroundService({ supported = true, error } = {}) {
  const container = new EventTarget();
  const registrations = [];
  container.ready = Promise.resolve(
    supported
      ? {
          sync: {
            async register(tag) {
              if (error) throw error;
              registrations.push(tag);
            },
          },
        }
      : {},
  );
  return { container, registrations };
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

test("a network failure retries the saved edit after reload and persists acknowledgement", async () => {
  const first = engine({
    online: true,
    fetch() {
      throw new TypeError("Unable to reach the server");
    },
  });
  await first.api.saveItem(originalNote, {
    title: "Offline edit",
    content: "Saved content",
  });
  await until(() => first.edit()?.attempts === 1);
  await first.api.syncPendingChanges();
  assert.equal(first.edit().nextAttemptAt, 2000);
  // A fresh runner shares only the persisted database, as after an app reload.
  const restored = engine({
    records: first.state.records,
    online: true,
    fetch: (request, state) => {
      assert.deepEqual(request.body, first.state.requests[0].body);
      assert.equal(request.body.version, "1");
      return Response.json({
        item: {
          ...originalNote,
          ...request.body,
          version: 2,
          updatedAt: state.now,
        },
      });
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
  assert.deepEqual(
    state.requests.map((request) => request.body.title),
    ["First", "Second"],
  );
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

test("saving offline registers background work, including after worker activation", async () => {
  const service = backgroundService();
  let activate;
  service.container.ready = new Promise((resolve) => {
    activate = resolve;
  });
  const page = engine({ serviceWorker: service.container });
  await page.api.saveItem(originalNote, {
    title: "Queued",
    content: "Offline",
  });
  assert.equal(page.edit().status, "pending");
  assert.equal(service.registrations.length, 0);

  const active = backgroundService();
  activate(await active.container.ready);
  await until(() => active.registrations.length === 1);
  assert.equal(active.registrations[0], "fieldkit-note-edits");
  assert.equal(page.state.requests.length, 0);
});

test("startup and manual retry register existing pending edits, but not empty queues", async () => {
  const saved = engine();
  await saved.api.saveItem(originalNote, {
    title: "Queued",
    content: "Offline",
  });
  const service = backgroundService();
  const page = engine({
    records: saved.state.records,
    serviceWorker: service.container,
  });
  const stop = page.api.startNoteSync();
  await until(() => service.registrations.length === 1);
  page.edit().status = "failed";
  await page.api.retryNoteEdit(originalNote.id);
  await until(() => service.registrations.length === 2);
  assert.equal(page.edit().status, "pending");
  await page.api.discardNoteEdit(originalNote.id);
  await page.api.requestNoteBackgroundSync();
  assert.equal(service.registrations.length, 2);
  stop();
});

for (const options of [
  { supported: false },
  { error: new DOMException("Background sync disabled", "NotAllowedError") },
]) {
  test(`reconnect fallback works when background sync is ${options.error ? "denied" : "unsupported"}`, async () => {
    const service = backgroundService(options);
    const page = engine({ serviceWorker: service.container });
    const stop = page.api.startNoteSync();
    await page.api.saveItem(originalNote, {
      title: "Fallback",
      content: "Safe",
    });
    await page.api.requestNoteBackgroundSync();
    assert.equal(page.edit().status, "pending");
    page.state.online = true;
    page.window.dispatchEvent(new Event("online"));
    await page.api.syncPendingChanges();
    assert.equal(page.edit().status, "synced");
    assert.equal(page.state.requests.length, 1);
    assert.equal(service.registrations.length, 0);
    stop();
  });
}

test("the service worker uploads persisted edits without page globals and notifies clients", async () => {
  const saved = engine();
  await saved.api.saveItem(originalNote, {
    title: "Background",
    content: "Edit",
  });
  const worker = engine({
    runtime: "worker",
    records: saved.state.records,
    online: true,
  });
  assert.equal(worker.backgroundSync("another-feature"), undefined);
  assert.equal(worker.state.requests.length, 0);
  const task = worker.backgroundSync();
  assert.ok(task, "The sync event must extend its lifetime with waitUntil");
  await task;
  assert.equal(worker.edit().status, "synced");
  assert.equal(worker.edit().note.version, 2);
  assert.equal(worker.state.requests[0].body.title, "Background");
  assert.equal(worker.state.requests[0].body.version, "1");
  assert.equal(worker.state.requests[0].credentials, "same-origin");
  assert.equal(worker.state.requests[0].method, "PATCH");
  assert.deepEqual(worker.state.messages, ["fieldkit-note-edits-changed"]);
  assert.equal(worker.state.timers.size, 0);
  await worker.backgroundSync();
  assert.equal(worker.state.requests.length, 1);
});

test("background sync refreshes and clears the overdue task badge without open pages", async () => {
  const saved = engine();
  await saved.api.saveItem(originalNote, {
    title: "Background",
    content: "Edit",
  });
  const badges = [];
  let overdue = 3;
  const worker = engine({
    runtime: "worker",
    records: saved.state.records,
    online: true,
    openClients: false,
    badging: {
      async setAppBadge(count) {
        badges.push(count);
      },
      async clearAppBadge() {
        badges.push(0);
      },
    },
    fetch(request) {
      if (request.method === "GET") {
        assert.ok(
          new URL(request.url, "https://fieldkit.test").pathname ===
            "/api/tasks",
        );
        assert.equal(request.credentials, "same-origin");
        return Response.json({
          userId: "fieldkit-demo-user",
          counts: { overdue },
        });
      }
      return Response.json({
        item: { ...originalNote, ...request.body, version: 2, updatedAt: 1000 },
      });
    },
  });
  await worker.backgroundSync();
  assert.equal(worker.edit().status, "synced");
  overdue = 0;
  await worker.backgroundSync();
  assert.deepEqual(badges, [3, 0]);
  assert.deepEqual(
    worker.state.requests.map((request) => request.method),
    ["PATCH", "GET", "GET"],
  );
});

for (const status of [401, 503]) {
  test(`badge refresh HTTP ${status} does not fail the background sync event`, async () => {
    let cleared = false;
    const worker = engine({
      runtime: "worker",
      online: true,
      badging: {
        async setAppBadge() {
          assert.fail("A failed request must not set a badge count");
        },
        async clearAppBadge() {
          cleared = true;
        },
      },
      fetch: () => Response.json({ error: "Unavailable" }, { status }),
    });
    await worker.backgroundSync();
    assert.equal(cleared, status === 401);
    assert.equal(worker.state.requests.length, 1);
  });
}

test("background uploads finish when all app pages are closed", async () => {
  const saved = engine();
  await saved.api.saveItem(originalNote, {
    title: "Closed app",
    content: "Edit",
  });
  const worker = engine({
    runtime: "worker",
    records: saved.state.records,
    online: true,
    openClients: false,
  });
  await worker.backgroundSync();
  assert.equal(worker.edit().status, "synced");
  assert.equal(worker.state.requests.length, 1);
  assert.equal(worker.state.messages.length, 0);
});

for (const failure of ["network", "timeout", 408, 429, 503]) {
  test(`background ${failure} failures reject the event and recover on a later browser attempt`, async () => {
    const saved = engine();
    await saved.api.saveItem(originalNote, { title: "Retry", content: "Keep" });
    const worker = engine({
      runtime: "worker",
      records: saved.state.records,
      online: true,
      fetch(request, state) {
        if (state.requests.length === 1) {
          if (failure === "network") throw new TypeError("Network unavailable");
          if (failure === "timeout")
            throw new DOMException("Timed out", "TimeoutError");
          return Response.json({ error: "Try later" }, { status: failure });
        }
        return Response.json({
          item: {
            ...originalNote,
            ...request.body,
            version: 2,
            updatedAt: 2000,
          },
        });
      },
    });
    await assert.rejects(worker.backgroundSync(), /still waiting/);
    assert.equal(worker.edit().status, "pending");
    assert.equal(worker.edit().attempts, 1);
    assert.equal(worker.edit().nextAttemptAt, 2000);
    assert.equal(worker.state.timers.size, 0);
    await worker.backgroundSync();
    assert.equal(worker.edit().status, "synced");
    assert.deepEqual(
      worker.state.requests.map((request) => request.body.version),
      ["1", "1"],
    );
  });
}

for (const status of [401, 409, 422]) {
  test(`background HTTP ${status} keeps the edit for review without requesting browser retries`, async () => {
    const saved = engine();
    await saved.api.saveItem(originalNote, {
      title: "Keep",
      content: "My work",
    });
    const worker = engine({
      runtime: "worker",
      records: saved.state.records,
      online: true,
      fetch: () => Response.json({ error: "Review required" }, { status }),
    });
    await worker.backgroundSync();
    assert.equal(worker.edit().status, "failed");
    assert.equal(worker.edit().payload.content, "My work");
    assert.equal(worker.edit().error, "Review required");
    await worker.backgroundSync();
    assert.equal(worker.state.requests.length, 1);
  });
}

test("a worker keeps a newer edit and uploads it with the acknowledged version", async () => {
  const page = engine();
  await page.api.saveItem(originalNote, { title: "First", content: "One" });
  let finish;
  const worker = engine({
    runtime: "worker",
    records: page.state.records,
    online: true,
    fetch(request, state) {
      const response = Response.json({
        item: {
          ...originalNote,
          ...request.body,
          version: state.requests.length + 1,
          updatedAt: 2000,
        },
      });
      if (state.requests.length === 1)
        return new Promise((resolve) => {
          finish = () => resolve(response);
        });
      return response;
    },
  });
  const task = worker.backgroundSync();
  await until(() => !!finish);
  await page.api.saveItem(originalNote, { title: "Second", content: "Two" });
  finish();
  await task;
  assert.deepEqual(
    worker.state.requests.map((request) => request.body.version),
    ["1", "2"],
  );
  assert.equal(worker.edit().payload.title, "Second");
  assert.equal(worker.edit().status, "synced");
  assert.equal(worker.edit().note.version, 3);
});

test("the worker waits for a page upload under the shared lock without duplicating it", async () => {
  let previous = Promise.resolve();
  let lockRequests = 0;
  const locks = {
    request(name, action) {
      assert.equal(name, "fieldkit-note-edits");
      lockRequests += 1;
      const task = previous.then(() => action({ name }));
      previous = task.catch(() => {});
      return task;
    },
  };
  let finish;
  const page = engine({
    online: true,
    locks,
    fetch(request) {
      return new Promise((resolve) => {
        finish = () =>
          resolve(
            Response.json({
              item: {
                ...originalNote,
                ...request.body,
                version: 2,
                updatedAt: 1000,
              },
            }),
          );
      });
    },
  });
  await page.api.saveItem(originalNote, {
    title: "One upload",
    content: "Edit",
  });
  await until(() => !!finish);
  const worker = engine({
    runtime: "worker",
    records: page.state.records,
    online: true,
    locks,
  });
  const task = worker.backgroundSync();
  await until(() => lockRequests === 2);
  assert.equal(worker.state.requests.length, 0);
  finish();
  await Promise.all([task, page.api.syncPendingChanges()]);
  assert.equal(page.edit().status, "synced");
  assert.equal(page.state.requests.length, 1);
  assert.equal(worker.state.requests.length, 0);
});

test("worker messages refresh open pages and the last subscriber removes the listener", async () => {
  const service = backgroundService();
  const page = engine({ serviceWorker: service.container });
  let refreshes = 0;
  page.window.addEventListener("fieldkit-notes-changed", () => {
    refreshes += 1;
  });
  const stop = page.api.startNoteSync();
  function send(data) {
    const event = new Event("message");
    Object.assign(event, { data });
    service.container.dispatchEvent(event);
  }
  send("another-feature");
  assert.equal(refreshes, 0);
  send("fieldkit-note-edits-changed");
  assert.equal(refreshes, 1);
  stop();
  send("fieldkit-note-edits-changed");
  assert.equal(refreshes, 1);
});

test("local edits and background uploads stay with their account", async () => {
  const records = new Map();
  const first = engine({ records });
  const secondId = "fieldkit-second-demo-user";
  const secondNote = {
    ...originalNote,
    id: "51b511ed-787a-4eb1-9128-14ac7cb043ca",
    userId: secondId,
  };
  const second = engine({ records, userId: secondId });
  await first.api.saveItem(originalNote, {
    title: "First account",
    content: "Private",
  });
  await second.api.saveItem(secondNote, {
    title: "Second account",
    content: "Also private",
  });
  assert.equal((await first.api.readNoteEdits(originalNote.userId)).length, 1);
  assert.equal(
    (await second.api.readNoteEdits(secondId))[0].value.note.id,
    secondNote.id,
  );
  await second.api.discardNoteEdit(originalNote.id, secondId);
  assert.ok(records.has(originalNote.id));

  const worker = engine({
    records,
    runtime: "worker",
    online: true,
    userId: secondId,
  });
  await worker.backgroundSync();
  assert.equal(worker.state.requests.length, 1);
  assert.equal(worker.state.requests[0].expectedUserId, secondId);
  assert.equal(worker.state.requests[0].body.title, "Second account");
  assert.equal(records.get(originalNote.id).value.status, "pending");
  assert.equal(records.get(secondNote.id).value.status, "synced");
});

test("a page cannot synchronize an account after its session changes", async () => {
  const page = engine();
  await page.api.saveItem(originalNote, {
    title: "Keep local",
    content: "Private",
  });
  page.state.userId = "fieldkit-second-demo-user";
  page.state.online = true;
  await assert.rejects(page.api.syncPendingChanges(true), /account changed/);
  assert.equal(page.state.requests.length, 0);
  assert.equal(page.edit().status, "pending");
});

test("signed-out background attempts preserve queued edits", async () => {
  const page = engine();
  await page.api.saveItem(originalNote, { title: "Keep", content: "Private" });
  const worker = engine({
    runtime: "worker",
    records: page.state.records,
    online: true,
    userId: null,
  });
  await assert.rejects(worker.backgroundSync(), /Sign in/);
  assert.equal(worker.state.requests.length, 0);
  assert.equal(worker.edit().status, "pending");
});

test("personal API caching requires matching account scope and a successful response", async () => {
  const worker = engine({ runtime: "worker" });
  const rule = worker.caching[0];
  const url = new URL("https://fieldkit.test/api/notes?userId=first");
  assert.equal(rule.matcher({ url, sameOrigin: true }), true);
  assert.equal(
    rule.matcher({
      url: new URL("https://fieldkit.test/api/notes"),
      sameOrigin: true,
    }),
    false,
  );
  const plugin = rule.handler.options.plugins.find(
    (plugin) => plugin.cacheWillUpdate,
  );
  const request = new Request(url);
  const own = Response.json(
    { userId: "first" },
    { headers: { "X-FieldKit-User": "first" } },
  );
  assert.equal(await plugin.cacheWillUpdate({ request, response: own }), own);
  const other = Response.json(
    { userId: "second" },
    { headers: { "X-FieldKit-User": "second" } },
  );
  assert.equal(
    await plugin.cacheWillUpdate({ request, response: other }),
    null,
  );
  assert.equal(
    await plugin.cacheWillUpdate({
      request,
      response: new Response(null, { status: 401 }),
    }),
    null,
  );
});

test("server note updates reject stale versions without overwriting newer changes", () => {
  const require = createRequire(import.meta.url);
  const {
    createNote,
    updateNote,
    getNote,
  } = require("../src/lib/products/store.ts");
  const note = createNote("fieldkit-demo-user", {
    title: "Server note",
    content: "Original",
  });
  const input = { title: "Edited", content: "New content" };
  assert.equal(updateNote("fieldkit-demo-user", note.id, 1, input).version, 2);
  assert.equal(getNote("fieldkit-demo-user", note.id).version, 2);
  assert.throws(
    () =>
      updateNote("fieldkit-demo-user", note.id, 1, {
        title: "Stale edit",
        content: "",
      }),
    (error) => error.status === 409,
  );
  assert.equal(getNote("fieldkit-demo-user", note.id).title, "Edited");
  assert.equal(getNote("fieldkit-demo-user", note.id).version, 2);
});
