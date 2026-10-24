import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `
      export { createSession, userFromSession } from './src/lib/auth/session';
      export * from './src/lib/products/store';
      export * from './src/lib/products/queries';
      export * from './src/lib/attachments/store';
      export { GET as tasksGET, POST as tasksPOST } from './src/app/api/tasks/route';
      export { GET as notesGET, POST as notesPOST } from './src/app/api/notes/route';
      export { GET as noteGET, PATCH as notePATCH, DELETE as noteDELETE } from './src/app/api/notes/[id]/route';
      export { GET as taskGET, PATCH as taskPATCH, DELETE as taskDELETE } from './src/app/api/tasks/[id]/route';
      export { PATCH as completePATCH } from './src/app/api/tasks/[id]/completion/route';
      export { GET as fileGET, DELETE as fileDELETE } from './src/app/api/attachments/[id]/route';
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "iife",
  globalName: "api",
  plugins: [
    {
      name: "request-context",
      setup(plugin) {
        plugin.onResolve(
          {
            filter:
              /^(server-only|react|next\/headers|next\/navigation|\.\/delay)$|api\/delay$/,
          },
          () => ({ path: "context", namespace: "test" }),
        );
        plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `
        export const cache = (fn) => fn;
        export const cookies = async () => ({ get: () => currentToken ? { value: currentToken } : undefined });
        export const redirect = () => { throw new Error('Redirect'); };
        export const simulateApiDelay = async () => {};
      `,
        }));
      },
    },
  ],
});

const firstId = "fieldkit-demo-user";
const secondId = "fieldkit-second-demo-user";

test("task creation retries are idempotent and mutation IDs are scoped to the account", async () => {
  const { api, signIn, call } = server();
  await signIn(firstId);
  const body = {
    title: "Offline creation",
    description: "",
    dueDate: "",
    mutationId: crypto.randomUUID(),
  };
  const first = await (
    await call(api.tasksPOST, { method: "POST", body })
  ).json();
  const retry = await (
    await call(api.tasksPOST, { method: "POST", body })
  ).json();
  assert.equal(first.item.id, retry.item.id);
  assert.equal((await (await call(api.tasksGET)).json()).items.length, 1);
  const changed = await call(api.tasksPOST, {
    method: "POST",
    body: { ...body, title: "Different payload" },
  });
  assert.equal(changed.status, 409);
  await signIn(secondId);
  const other = await (
    await call(api.tasksPOST, { method: "POST", body })
  ).json();
  assert.notEqual(other.item.id, first.item.id);
  assert.equal(other.item.userId, secondId);
});

test("task edit retries replay their receipt without reapplying changes or overwriting newer edits", async () => {
  const { api, signIn, call } = server();
  await signIn(firstId);
  const task = api.createTask(firstId, {
    title: "Original",
    description: "",
    dueDate: "",
  });
  const body = {
    title: "Offline edit",
    description: "",
    dueDate: "",
    version: "1",
    mutationId: crypto.randomUUID(),
  };
  const first = await (
    await call(api.taskPATCH, { id: task.id, method: "PATCH", body })
  ).json();
  assert.equal(first.item.version, 2);
  await call(api.taskPATCH, {
    id: task.id,
    method: "PATCH",
    body: {
      ...body,
      version: "2",
      title: "Newer edit",
      mutationId: crypto.randomUUID(),
    },
  });
  const replay = await (
    await call(api.taskPATCH, { id: task.id, method: "PATCH", body })
  ).json();
  assert.equal(replay.item.version, 2);
  const current = await (await call(api.taskGET, { id: task.id })).json();
  assert.equal(current.title, "Newer edit");
  assert.equal(current.version, 3);
  const conflict = await call(api.taskPATCH, {
    id: task.id,
    method: "PATCH",
    body: { ...body, mutationId: crypto.randomUUID() },
  });
  assert.equal(conflict.status, 409);
});

test("task APIs reject invalid mutation IDs", async () => {
  const { api, signIn, call } = server();
  await signIn(firstId);
  const result = await call(api.tasksPOST, {
    method: "POST",
    body: {
      title: "Invalid",
      description: "",
      dueDate: "",
      mutationId: "invalid",
    },
  });
  assert.equal(result.status, 400);
});

function server() {
  const context = vm.createContext({
    require: createRequire(import.meta.url),
    process: {
      env: {
        NODE_ENV: "test",
        SESSION_SECRET: "fieldkit-test-session-secret-only-32-characters",
      },
    },
    TextEncoder,
    TextDecoder,
    CryptoKey,
    btoa,
    atob,
    crypto,
    Response,
    Request,
    Headers,
    URL,
    Uint8Array,
    structuredClone,
    Blob,
    console,
    currentToken: undefined,
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  const api = context.api;
  return {
    api,
    async signIn(userId) {
      context.currentToken = userId
        ? await api.createSession(userId)
        : undefined;
    },
    async call(
      handler,
      { id, method = "GET", body, query = "", headers = {} } = {},
    ) {
      const request = new Request(`https://fieldkit.test/api/items${query}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return handler(request, { params: Promise.resolve({ id }) });
    },
  };
}

test("task and note list APIs return only the session owner's data and counts", async () => {
  const { api, signIn, call } = server();
  await signIn(firstId);
  const first = await (
    await call(api.tasksPOST, {
      method: "POST",
      body: {
        title: "First task",
        description: "Private",
        dueDate: "2000-01-01",
        userId: secondId,
      },
    })
  ).json();
  assert.equal(first.item.userId, firstId);
  const note = await (
    await call(api.notesPOST, {
      method: "POST",
      body: { title: "First note", content: "Private", userId: secondId },
    })
  ).json();
  assert.equal(note.item.userId, firstId);
  await signIn(secondId);
  await call(api.tasksPOST, {
    method: "POST",
    body: { title: "Second task", description: "Private", dueDate: "" },
  });
  await call(api.notesPOST, {
    method: "POST",
    body: { title: "Second note", content: "Private" },
  });
  const tasksResponse = await call(api.tasksGET, {
    query: `?userId=${secondId}&timeZone=Asia%2FTehran`,
  });
  const tasks = await tasksResponse.json();
  assert.equal(tasksResponse.headers.get("X-FieldKit-User"), secondId);
  assert.equal(tasks.userId, secondId);
  assert.equal(tasks.items.length, 1);
  assert.equal(tasks.items[0].title, "Second task");
  assert.equal(tasks.counts.overdue, 0);
  assert.equal(tasks.timeZone, "Asia/Tehran");
  const notes = await (await call(api.notesGET)).json();
  assert.equal(notes.items.length, 1);
  assert.equal(notes.items[0].title, "Second note");
  await signIn(firstId);
  const own = await (await call(api.tasksGET)).json();
  assert.equal(own.counts.overdue, 1);
  assert.equal(own.items[0].title, "First task");
});

test("foreign item reads, edits, completion changes, and deletions return 404", async () => {
  const { api, signIn, call } = server();
  const task = api.createTask(firstId, {
    title: "Private task",
    description: "",
    dueDate: "",
  });
  const note = api.createNote(firstId, { title: "Private note", content: "" });
  await signIn(secondId);
  for (const [handler, options] of [
    [api.taskGET, { id: task.id }],
    [
      api.taskPATCH,
      {
        id: task.id,
        method: "PATCH",
        body: { title: "Changed", description: "", dueDate: "", version: "1" },
      },
    ],
    [
      api.completePATCH,
      { id: task.id, method: "PATCH", body: { completed: true, version: "1" } },
    ],
    [api.taskDELETE, { id: task.id, method: "DELETE", body: { version: "1" } }],
    [api.noteGET, { id: note.id }],
    [
      api.notePATCH,
      {
        id: note.id,
        method: "PATCH",
        body: { title: "Changed", content: "", version: "1" },
      },
    ],
    [api.noteDELETE, { id: note.id, method: "DELETE", body: { version: "1" } }],
  ])
    assert.equal((await call(handler, options)).status, 404);
  assert.equal(api.getTask(firstId, task.id).title, "Private task");
  assert.equal(api.getNote(firstId, note.id).version, 1);
});

test("account scope checks reject stale pages and unauthenticated requests", async () => {
  const { api, signIn, call } = server();
  await signIn(secondId);
  assert.equal(
    (await call(api.notesGET, { query: `?userId=${firstId}` })).status,
    401,
  );
  assert.equal(
    (
      await call(api.notesPOST, {
        method: "POST",
        headers: { "X-FieldKit-User": firstId },
        body: { title: "Stale tab", content: "" },
      })
    ).status,
    401,
  );
  assert.equal((await call(api.notesGET)).status, 200);
  await signIn(null);
  assert.equal((await call(api.notesGET)).status, 401);
  assert.equal((await call(api.tasksGET)).status, 401);
});

test("attachment downloads, removal, and parent lookups enforce ownership", async () => {
  const { api, signIn, call } = server();
  const note = api.createNote(firstId, { title: "Private", content: "" });
  const file = api.addAttachment(firstId, "note", note.id, {
    name: "private.txt",
    mimeType: "text/plain",
    bytes: new Uint8Array([65]),
  });
  assert.throws(
    () =>
      api.addAttachment(secondId, "note", note.id, {
        name: "invalid.txt",
        mimeType: "text/plain",
        bytes: new Uint8Array(),
      }),
    (error) => error.status === 404,
  );
  await signIn(secondId);
  assert.equal((await call(api.fileGET, { id: file.id })).status, 404);
  assert.equal(
    (
      await call(api.fileDELETE, {
        id: file.id,
        method: "DELETE",
        body: { version: "1" },
      })
    ).status,
    404,
  );
  await signIn(firstId);
  const downloaded = await call(api.fileGET, { id: file.id });
  assert.equal(downloaded.status, 200);
  assert.equal(await downloaded.text(), "A");
  api.deleteItem(firstId, "note", note.id, 1);
  assert.equal((await call(api.fileGET, { id: file.id })).status, 404);
});

test("owned task completion updates counts and stale versions remain protected", async () => {
  const { api, signIn, call } = server();
  await signIn(firstId);
  const task = api.createTask(firstId, {
    title: "Overdue",
    description: "",
    dueDate: "2000-01-01",
  });
  const updated = await call(api.completePATCH, {
    id: task.id,
    method: "PATCH",
    body: { completed: true, version: "1" },
  });
  assert.equal(updated.status, 200);
  const tasks = await (await call(api.tasksGET)).json();
  assert.equal(tasks.counts.overdue, 0);
  assert.equal(tasks.counts.completedTasks, 1);
  assert.equal(
    (
      await call(api.taskDELETE, {
        id: task.id,
        method: "DELETE",
        body: { version: "1" },
      })
    ).status,
    409,
  );
});
