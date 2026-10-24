import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const storagePlugin = {
  name: "isolated-task-storage",
  setup(plugin) {
    plugin.onResolve({ filter: /indexed-db\/indexed-db$/ }, () => ({
      path: "storage",
      namespace: "test",
    }));
    plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
      contents: `
      export const getAllFromStore = (name) => storage.read(name);
      export const findFromStore = (name, key) => storage.find(name, key);
      export const modifyFromStore = (...args) => storage.modify(...args);
    `,
    }));
  },
};
const bundle = await build({
  stdin: {
    contents: `export * from './src/lib/products/task-sync';
    export * from './src/lib/products/task-sync/storage';
    export { applyTaskChanges } from './src/lib/products/task-sync/changes';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  globalName: "taskApi",
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
          () => ({ path: "cache", namespace: "cache-test" }),
        );
        plugin.onLoad({ filter: /.*/, namespace: "cache-test" }, () => ({
          contents: `
        export const defaultCache = [];
        export class Serwist { addEventListeners() {} }
        export class ExpirationPlugin {}
        export class NetworkFirst {}
        export class NetworkOnly {}
      `,
        }));
      },
    },
  ],
});

const userId = "fieldkit-demo-user";
const original = {
  id: "ca27f27a-e24d-4d04-b177-795e7d3c2921",
  userId,
  version: 3,
  title: "Original",
  description: "Description",
  dueDate: "",
  completed: false,
  group: "unscheduled",
  reminderAt: null,
  attachments: [],
};
const payload = {
  title: "Offline task",
  description: "Saved locally",
  dueDate: "2000-01-01",
};
const serverId = "0a5955a0-2c13-4397-ab96-01e2e4fd99c0";
const list = (items = [], owner = userId) => ({
  userId: owner,
  items,
  today: "2026-10-24",
  timeZone: "Asia/Tehran",
  counts: {
    dueToday: 0,
    overdue: 0,
    openTasks: items.length,
    completedTasks: 0,
  },
});

function engine({
  records = new Map(),
  online = false,
  fetch: fetcher,
  runtime = "page",
  sessionUser = userId,
  locks,
  serviceWorker,
  storageError = false,
} = {}) {
  const state = {
    online,
    records,
    sessionUser,
    requests: [],
    timers: new Map(),
    messages: [],
    warnings: [],
    registrations: [],
    now: Date.now(),
  };
  const window = new EventTarget();
  const worker = new EventTarget();
  worker.clients = {
    async matchAll() {
      return [{ postMessage: (message) => state.messages.push(message) }];
    },
  };
  const storage = {
    async read(name) {
      return name === "tasks" ? structuredClone([...records.values()]) : [];
    },
    async find(_name, key) {
      return structuredClone(records.get(key));
    },
    async modify(_name, key, change) {
      if (storageError) throw new Error("Storage unavailable");
      const result = change(structuredClone(records.get(key)));
      if (result) records.set(key, structuredClone(result));
      else records.delete(key);
      return structuredClone(result);
    },
  };
  const context = vm.createContext({
    ...(runtime === "page" ? { window } : { self: worker }),
    console: { warn: (...args) => state.warnings.push(args) },
    crypto,
    Event,
    Headers,
    Response,
    AbortSignal,
    DOMException,
    TypeError,
    URL,
    URLSearchParams,
    Intl,
    Date,
    storage,
    navigator: {
      ...(locks ? { locks } : {}),
      ...(serviceWorker ? { serviceWorker } : {}),
      get onLine() {
        return state.online;
      },
    },
    setTimeout(callback, delay) {
      const id = crypto.randomUUID();
      state.timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      state.timers.delete(id);
    },
    async fetch(url, options) {
      if (url === "/api/auth/session")
        return state.sessionUser
          ? Response.json({
              user: { id: state.sessionUser, email: "demo@fieldkit.app" },
            })
          : Response.json({ error: "Sign in" }, { status: 401 });
      const request = {
        url,
        method: options.method ?? "GET",
        body: options.body ? JSON.parse(options.body) : undefined,
        userId: new Headers(options.headers).get("X-FieldKit-User"),
      };
      if (request.method === "GET") return Response.json(list());
      state.requests.push(request);
      if (fetcher) return fetcher(request, state);
      return Response.json({
        item: {
          ...original,
          ...request.body,
          id: request.method === "POST" ? serverId : url.split("/").at(-1),
          version:
            request.method === "POST" ? 1 : Number(request.body.version) + 1,
          createdAt: state.now,
          updatedAt: state.now,
          deletedAt: null,
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
    api: context.taskApi,
    backgroundSync() {
      const event = new Event("sync");
      let promise;
      Object.assign(event, {
        tag: "fieldkit-task-changes",
        waitUntil(value) {
          promise = value;
        },
      });
      worker.dispatchEvent(event);
      return promise;
    },
  };
}

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail("Expected task synchronization to settle");
}

test("offline creation survives reload, appears immediately, and updates counts", async () => {
  const first = engine();
  await first.api.saveTask(userId, payload);
  assert.equal(first.state.requests.length, 0);
  const reloaded = engine({ records: first.state.records });
  const data = await reloaded.api.loadLocalTasks(userId);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].title, payload.title);
  assert.equal(data.items[0].syncStatus, "pending");
  assert.equal(data.items[0].localOnly, true);
  assert.equal(data.counts.overdue, 1);
  assert.equal(data.counts.openTasks, 1);
  assert.equal(
    (await reloaded.api.loadLocalTasks("other-account")).items.length,
    0,
  );
});

test("offline edits coalesce, preserve their baseline, and overlay cached lists", async () => {
  const { api, state } = engine();
  await api.mergeLocalTasks(list([original]));
  await api.saveTask(userId, payload, original);
  await api.saveTask(
    userId,
    { ...payload, title: "Latest", dueDate: "" },
    original,
  );
  const data = await api.loadLocalTasks(userId);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].title, "Latest");
  assert.equal(data.items[0].version, 3);
  assert.equal(data.counts.overdue, 0);
  assert.equal(state.records.get(original.id).value.revision, 2);
  assert.equal(state.requests.length, 0);
});

test("creation sync replaces the temporary ID without duplicates or losing a stale-cache overlay", async () => {
  const { api, state } = engine();
  await api.saveTask(userId, payload);
  const localId = (await api.loadLocalTasks(userId)).items[0].id;
  state.online = true;
  await api.syncTaskChanges(true, userId);
  const data = await api.loadLocalTasks(userId);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].id, serverId);
  assert.equal(data.items[0].localId, localId);
  assert.equal(data.items[0].localOnly, undefined);
  assert.equal(data.items[0].syncStatus, undefined);
  const merged = await api.mergeLocalTasks(list([{ ...data.items[0] }]));
  assert.equal(merged.items.length, 1);
  // Once the server confirmed it, a later deletion must not resurrect it.
  assert.equal((await api.mergeLocalTasks(list())).items.length, 0);
  assert.equal(state.requests[0].method, "POST");
  assert.equal(state.requests[0].userId, userId);
});

test("an unsynced task can be edited before upload and is created once with its latest values", async () => {
  const { api, state } = engine();
  await api.saveTask(userId, payload);
  const task = (await api.loadLocalTasks(userId)).items[0];
  await api.saveTask(userId, { ...payload, title: "Edited before sync" }, task);
  state.online = true;
  await api.syncTaskChanges(true, userId);
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0].method, "POST");
  assert.equal(state.requests[0].body.title, "Edited before sync");
});

test("a lost response retries the same immutable mutation after reload", async () => {
  const first = engine({
    fetch() {
      throw new TypeError("Response lost");
    },
  });
  await first.api.saveTask(userId, payload);
  first.state.online = true;
  await first.api.syncTaskChanges(true, userId);
  const firstRequest = first.state.requests[0];
  const reloaded = engine({ records: first.state.records, online: true });
  await reloaded.api.syncTaskChanges(true, userId);
  assert.equal(
    reloaded.state.requests[0].body.mutationId,
    firstRequest.body.mutationId,
  );
  assert.deepEqual(reloaded.state.requests[0].body, firstRequest.body);
  assert.equal(
    (await reloaded.api.loadLocalTasks(userId)).items[0].syncStatus,
    undefined,
  );
});

test("an edit made during creation uploads next using the server ID and acknowledged version", async () => {
  let release;
  const { api, state } = engine({
    fetch(request) {
      if (request.method === "POST")
        return new Promise((resolve) => {
          release = () =>
            resolve(
              Response.json({
                item: {
                  ...original,
                  ...request.body,
                  id: serverId,
                  version: 1,
                },
              }),
            );
        });
      return Response.json({
        item: { ...original, ...request.body, id: serverId, version: 2 },
      });
    },
  });
  await api.saveTask(userId, payload);
  const task = (await api.loadLocalTasks(userId)).items[0];
  state.online = true;
  const syncing = api.syncTaskChanges(true, userId);
  await until(() => !!release);
  await api.saveTask(userId, { ...payload, title: "Newer edit" }, task);
  release();
  await syncing;
  assert.equal(state.requests.length, 2);
  assert.equal(state.requests[1].method, "PATCH");
  assert.equal(state.requests[1].url, `/api/tasks/${serverId}`);
  assert.equal(state.requests[1].body.version, "1");
  assert.equal(state.requests[1].body.title, "Newer edit");
  assert.notEqual(
    state.requests[1].body.mutationId,
    state.requests[0].body.mutationId,
  );
  assert.equal((await api.loadLocalTasks(userId)).items[0].title, "Newer edit");
});

test("conflicts preserve local edits, stop automatic retries, and can be discarded", async () => {
  const { api, state } = engine({
    fetch() {
      return Response.json({ error: "Changed elsewhere" }, { status: 409 });
    },
  });
  await api.mergeLocalTasks(list([original]));
  await api.saveTask(userId, payload, original);
  state.online = true;
  await api.syncTaskChanges(true, userId);
  const task = (await api.loadLocalTasks(userId)).items[0];
  assert.equal(task.syncStatus, "failed");
  assert.match(task.syncError, /changed elsewhere/);
  assert.equal(task.title, payload.title);
  await api.syncTaskChanges(true, userId);
  assert.equal(state.requests.length, 1);
  await api.discardTaskChange(task);
  assert.equal((await api.loadLocalTasks(userId)).items[0].title, "Original");
});

test("manual retry recovers a failed upload without changing its mutation ID", async () => {
  let fail = true;
  const { api, state } = engine({
    fetch(request) {
      return fail
        ? Response.json({ error: "Sign in again" }, { status: 401 })
        : Response.json({ item: { ...original, ...request.body, version: 4 } });
    },
  });
  await api.saveTask(userId, payload, original);
  state.online = true;
  await api.syncTaskChanges(true, userId);
  const task = (await api.loadLocalTasks(userId)).items[0];
  assert.equal(task.syncStatus, "failed");
  fail = false;
  await api.retryTaskChange(task);
  assert.equal(state.requests.length, 2);
  assert.equal(
    state.requests[0].body.mutationId,
    state.requests[1].body.mutationId,
  );
  assert.equal(
    (await api.loadLocalTasks(userId)).items[0].syncStatus,
    undefined,
  );
});

test("startup and reconnect synchronize pending tasks without Background Sync support", async () => {
  const { api, state, window } = engine();
  await api.saveTask(userId, payload);
  const stop = api.startTaskSync(userId);
  state.online = true;
  window.dispatchEvent(new Event("online"));
  await until(() => state.requests.length === 1);
  await api.syncTaskChanges(false, userId);
  stop();
  assert.equal(
    (await api.loadLocalTasks(userId)).items[0].syncStatus,
    undefined,
  );
  assert.equal(state.timers.size, 0);
});

test("retryable failures schedule a bounded retry while the app stays open", async () => {
  const { api, state } = engine({
    fetch() {
      return Response.json({ error: "Unavailable" }, { status: 503 });
    },
  });
  await api.saveTask(userId, payload);
  state.online = true;
  const stop = api.startTaskSync(userId);
  await api.syncTaskChanges(false, userId);
  await until(() => state.timers.size > 0);
  assert.equal(
    (await api.loadLocalTasks(userId)).items[0].syncStatus,
    "pending",
  );
  const timer = [...state.timers.values()][0];
  assert.ok(timer.delay >= 1000 && timer.delay <= 60_000);
  stop();
  assert.equal(state.timers.size, 0);
});

test("a different session never uploads or exposes another account's pending tasks", async () => {
  const first = engine();
  await first.api.saveTask(userId, payload);
  const other = engine({
    records: first.state.records,
    online: true,
    sessionUser: "other-user",
  });
  await assert.rejects(
    other.api.syncTaskChanges(true, userId),
    /account changed/,
  );
  assert.equal(other.state.requests.length, 0);
  assert.equal((await other.api.loadLocalTasks("other-user")).items.length, 0);
  await assert.rejects(
    other.api.saveTask("other-user", payload, original),
    /another account/,
  );
  await other.api.discardTaskChange({ ...original, userId: "other-user" });
  assert.equal((await first.api.loadLocalTasks(userId)).items.length, 1);
});

test("the service worker uploads task creations and notifies open pages", async () => {
  const first = engine();
  await first.api.saveTask(userId, payload);
  const worker = engine({
    records: first.state.records,
    online: true,
    runtime: "worker",
  });
  await worker.backgroundSync();
  assert.equal(worker.state.requests.length, 1);
  assert.equal(worker.state.requests[0].method, "POST");
  assert.deepEqual(worker.state.messages, ["fieldkit-task-changes-synced"]);
  assert.equal(
    (await first.api.loadLocalTasks(userId)).items[0].syncStatus,
    undefined,
  );
});

test("background sync registration is requested when supported", async () => {
  const registrations = [];
  const serviceWorker = new EventTarget();
  serviceWorker.ready = Promise.resolve({
    sync: {
      async register(tag) {
        registrations.push(tag);
      },
    },
  });
  const { api } = engine({ serviceWorker });
  await api.saveTask(userId, payload);
  await until(() => registrations.length > 0);
  assert.equal(registrations[0], "fieldkit-task-changes");
});

test("storage failure never reports a task as saved or sends it to the API", async () => {
  const { api, state } = engine({ storageError: true, online: true });
  await assert.rejects(api.saveTask(userId, payload), /Storage unavailable/);
  assert.equal(state.requests.length, 0);
});

test("page and worker share the upload lock and do not create a task twice", async () => {
  let held = Promise.resolve();
  const locks = {
    request(_name, action) {
      const result = held.then(action);
      held = result.catch(() => {});
      return result;
    },
  };
  let release;
  const page = engine({
    locks,
    fetch(request) {
      return new Promise((resolve) => {
        release = () =>
          resolve(
            Response.json({
              item: { ...original, ...request.body, id: serverId, version: 1 },
            }),
          );
      });
    },
  });
  await page.api.saveTask(userId, payload);
  page.state.online = true;
  const uploading = page.api.syncTaskChanges(true, userId);
  await until(() => !!release);
  const worker = engine({
    records: page.state.records,
    online: true,
    runtime: "worker",
    locks,
  });
  const background = worker.backgroundSync();
  release();
  await Promise.all([uploading, background]);
  assert.equal(page.state.requests.length, 1);
  assert.equal(worker.state.requests.length, 0);
});

test("background failures keep tasks pending and recover on the next browser attempt", async () => {
  const page = engine();
  await page.api.saveTask(userId, payload);
  const worker = engine({
    records: page.state.records,
    online: true,
    runtime: "worker",
    fetch() {
      throw new TypeError("Offline");
    },
  });
  await assert.rejects(worker.backgroundSync(), /waiting to synchronize/);
  assert.equal(
    (await page.api.loadLocalTasks(userId)).items[0].syncStatus,
    "pending",
  );
  const recovered = engine({
    records: page.state.records,
    online: true,
    runtime: "worker",
  });
  await recovered.backgroundSync();
  assert.equal(
    recovered.state.requests[0].body.mutationId,
    worker.state.requests[0].body.mutationId,
  );
});

test("a signed-out worker preserves the account's pending task without an upload", async () => {
  const page = engine();
  await page.api.saveTask(userId, payload);
  const worker = engine({
    records: page.state.records,
    online: true,
    runtime: "worker",
    sessionUser: null,
  });
  await assert.rejects(worker.backgroundSync(), /Sign in/);
  assert.equal(worker.state.requests.length, 0);
  assert.equal(
    (await page.api.loadLocalTasks(userId)).items[0].syncStatus,
    "pending",
  );
});
