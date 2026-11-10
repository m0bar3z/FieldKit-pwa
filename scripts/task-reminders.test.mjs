import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createECDH, randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
const deviceKey = createECDH("prime256v1");
deviceKey.generateKeys();
const bundle = await build({
  stdin: {
    contents: `
    export * from './src/lib/push/config';
    export * from './src/lib/push/store';
    export * from './src/lib/push/schemas';
    export * from './src/lib/push/dispatch';
    export * from './src/lib/push/worker';
    export * from './src/lib/products/store';
    export * from './src/lib/products/queries';
    export * from './src/lib/products/reminder-time';
    export * from './src/lib/products/schemas';
    export * from './src/lib/auth/session';
    export { GET as status, POST as subscribe, DELETE as unsubscribe } from './src/app/api/push/subscription/route';
    export { POST as dispatch } from './src/app/api/internal/task-reminders/route';
    export { POST as login } from './src/app/api/auth/login/route';
    export { DELETE as logout } from './src/app/api/auth/session/route';
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
      name: "context",
      setup(plugin) {
        plugin.onResolve(
          {
            filter:
              /^(server-only|react|next\/headers|next\/navigation|next\/server|\.\/delay)$|api\/delay$/,
          },
          () => ({ path: "context", namespace: "test" }),
        );
        plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `
      export const cache=fn=>fn;
      export const cookies=async()=>({get:()=>currentToken ? {value:currentToken} : undefined});
      export const redirect=()=>{throw Error('Redirect')};
      export const simulateApiDelay=async()=>{};
      export class NextResponse extends Response {
        cookies={set(){}};
        static json(data, init){return new NextResponse(JSON.stringify(data),init)}
      }
    `,
        }));
      },
    },
  ],
});
const owner = "fieldkit-demo-user";
const other = "fieldkit-second-demo-user";
const secret = "a".repeat(64);
const secondSecret = "b".repeat(64);
const subscription = (suffix = "first") => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`,
  expirationTime: null,
  keys: {
    p256dh: deviceKey.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  },
});
function server() {
  const env = {
    NODE_ENV: "test",
    SESSION_SECRET: "fieldkit-test-session-secret-only-32-characters",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: "mailto:test@example.com",
    TASK_REMINDER_CRON_SECRET: "c".repeat(64),
  };
  const context = vm.createContext({
    require: createRequire(import.meta.url),
    process: { env },
    Buffer,
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
    AbortSignal,
    setTimeout,
    clearTimeout,
    currentToken: undefined,
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  const api = context.api;
  return {
    api,
    env,
    async signIn(userId = owner) {
      context.currentToken = await api.createSession(userId);
      const session = await api.sessionDetails(context.currentToken);
      return {
        userId,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
      };
    },
    call(handler, { method = "GET", body, headers = {} } = {}) {
      return handler(
        new Request("https://fieldkit.test/api/push/subscription", {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-FieldKit-Device": secret,
            ...headers,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
    },
  };
}
function task(api, changes = {}) {
  return api.createTask(owner, {
    title: "Private task",
    description: "",
    dueDate: "",
    reminderAt: Date.now() - 1000,
    ...changes,
  });
}

test("push configuration is lazy, verifies a matching key pair, and exposes no secrets", () => {
  const { api, env } = server();
  assert.equal(api.publicPushConfig().configured, true);
  assert.deepEqual(Object.keys(api.publicPushConfig()).sort(), [
    "configured",
    "publicKey",
  ]);
  env.VAPID_PRIVATE_KEY = webpush.generateVAPIDKeys().privateKey;
  assert.equal(api.publicPushConfig().configured, false);
  assert.throws(
    () => api.pushConfig(),
    (error) => error.status === 503,
  );
  assert.equal(task(api).title, "Private task");
});

test("subscription validation rejects local endpoints, foreign services, credentials and malformed keys", () => {
  const { api } = server();
  assert.equal(api.subscriptionSchema.safeParse(subscription()).success, true);
  for (const endpoint of [
    "http://fcm.googleapis.com/x",
    "https://127.0.0.1/x",
    "https://fcm.googleapis.com.evil.test/x",
    "https://user@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://example.com/x",
  ]) {
    assert.equal(
      api.subscriptionSchema.safeParse({ ...subscription(), endpoint }).success,
      false,
      endpoint,
    );
  }
  assert.equal(
    api.subscriptionSchema.safeParse({
      ...subscription(),
      keys: { p256dh: "bad", auth: "bad" },
    }).success,
    false,
  );
});

test("subscription routes require authentication, same origin, and the expected account", async () => {
  const s = server();
  assert.equal((await s.call(s.api.status)).status, 401);
  await s.signIn();
  const body = { deviceSecret: secret, subscription: subscription() };
  assert.equal(
    (
      await s.call(s.api.subscribe, {
        method: "POST",
        body,
        headers: { Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await s.call(s.api.subscribe, {
        method: "POST",
        body,
        headers: { "X-FieldKit-User": other },
      })
    ).status,
    401,
  );
  assert.equal(
    (await s.call(s.api.subscribe, { method: "POST", body })).status,
    200,
  );
  assert.equal((await (await s.call(s.api.status)).json()).subscribed, true);
  assert.equal(
    (await s.call(s.api.unsubscribe, { method: "DELETE" })).status,
    200,
  );
  assert.equal((await (await s.call(s.api.status)).json()).subscribed, false);
});

test("device capabilities prevent takeover; explicit registration can move a browser between accounts", async () => {
  const { api, signIn } = server();
  const first = await signIn();
  const sub = subscription();
  api.registerDevice(first, secret, sub);
  const second = await signIn(other);
  assert.equal(api.deviceBinding(second, secret), undefined);
  api.removeDevice(second, secret);
  assert.equal(api.pushStore.bindings.size, 1);
  assert.throws(
    () => api.registerDevice(second, secondSecret, sub),
    (error) => error.status === 409,
  );
  api.registerDevice(second, secret, sub);
  assert.equal(api.deviceBinding(first, secret), undefined);
  assert.equal(api.deviceBinding(second, secret).userId, other);
});

test("logout removes only the outgoing session's devices", async () => {
  const s = server();
  const first = await s.signIn();
  s.api.registerDevice(first, secret, subscription());
  const second = await s.signIn();
  s.api.registerDevice(second, secondSecret, subscription("second"));
  assert.equal((await s.call(s.api.logout, { method: "DELETE" })).status, 200);
  assert.equal(s.api.pushStore.bindings.size, 1);
  assert.equal(s.api.deviceBinding(first, secret).sessionId, first.sessionId);
});

test("replacement login removes outgoing subscriptions only after valid credentials", async () => {
  const s = server();
  s.api.registerDevice(await s.signIn(), secret, subscription());
  assert.equal(
    (
      await s.call(s.api.login, {
        method: "POST",
        body: { email: "invalid@example.com", password: "wrong" },
      })
    ).status,
    401,
  );
  assert.equal(s.api.pushStore.bindings.size, 1);
  assert.equal(
    (
      await s.call(s.api.login, {
        method: "POST",
        body: { email: "second@fieldkit.app", password: "FieldKit123!" },
      })
    ).status,
    200,
  );
  assert.equal(s.api.pushStore.bindings.size, 0);
});

test("task reminder edits preserve legacy omitted fields and can explicitly remove a reminder", () => {
  const { api } = server();
  const item = task(api);
  const original = item.reminderAt;
  const revision = item.reminderRevision;
  api.updateTask(owner, item.id, item.version, {
    title: "Text edit",
    description: "",
    dueDate: "",
  });
  assert.equal(item.reminderAt, original);
  assert.equal(item.reminderRevision, revision);
  api.updateTask(owner, item.id, item.version, {
    title: item.title,
    description: "",
    dueDate: "",
    reminderAt: null,
  });
  assert.equal(item.reminderAt, null);
  assert.equal(item.reminderRevision, revision + 1);
  assert.equal(api.getTasks(owner).items[0].reminderAt, null);
  assert.equal(
    api.createTask(owner, { title: "Old client", description: "", dueDate: "" })
      .reminderAt,
    null,
  );
});

test("reminder selection validates new past times while permitting unchanged past reminders", () => {
  const { api } = server();
  assert.ok(api.reminderSelectionError(100, null, 200));
  assert.equal(api.reminderSelectionError(100, 100, 200), null);
  assert.equal(api.reminderSelectionError(null, 100, 200), null);
  assert.equal(api.reminderSelectionError(300, null, 200), null);
  const timestamp = new Date(2030, 6, 2, 15, 45).getTime();
  assert.equal(
    api.reminderTimestamp(api.reminderLocalTime(timestamp)),
    timestamp,
  );
  assert.equal(api.reminderTimestamp(""), null);
  assert.equal(Number.isNaN(api.reminderTimestamp("invalid")), true);
  assert.equal(
    api.taskSchema.safeParse({
      title: "Task",
      description: "",
      dueDate: "",
      reminderAt: -1,
    }).success,
    false,
  );
});

test("dispatcher selects only due active tasks and sends independently to multiple devices", async () => {
  const { api, signIn } = server();
  const scope = await signIn();
  api.registerDevice(scope, secret, subscription());
  api.registerDevice(scope, secondSecret, subscription("second"));
  const due = task(api);
  task(api, { completed: true });
  task(api, { reminderAt: Date.now() + 60000 });
  task(api, { reminderAt: Date.now() - 90000000 });
  const deleted = task(api);
  api.deleteItem(owner, "task", deleted.id, deleted.version);
  const foreign = api.createTask(other, {
    title: "Foreign",
    description: "",
    dueDate: "",
    reminderAt: Date.now() - 1000,
  });
  const sent = [];
  const result = await api.dispatchReminders(async (binding, payload) =>
    sent.push({ binding, payload }),
  );
  assert.equal(result.accepted, 2);
  assert.equal(
    sent.every((item) => item.payload.taskId === due.id),
    true,
  );
  assert.equal(
    sent.some((item) => item.payload.taskId === foreign.id),
    false,
  );
  assert.equal(sent[0].payload.title, undefined);
  assert.equal(
    (await api.dispatchReminders(async () => assert.fail("duplicate")))
      .accepted,
    0,
  );
});

test("completed reminders do not resend after reopening or text edits; choosing a new time re-arms delivery", async () => {
  const { api, signIn } = server();
  api.registerDevice(await signIn(), secret, subscription());
  const item = task(api);
  await api.dispatchReminders(async () => {});
  api.setTaskCompleted(owner, item.id, item.version, true);
  api.setTaskCompleted(owner, item.id, item.version, false);
  api.updateTask(owner, item.id, item.version, {
    title: "Edited",
    description: "",
    dueDate: "",
  });
  assert.equal(
    (await api.dispatchReminders(async () => assert.fail("repeat"))).accepted,
    0,
  );
  api.updateTask(owner, item.id, item.version, {
    title: item.title,
    description: "",
    dueDate: "",
    reminderAt: Date.now() - 10,
  });
  assert.equal((await api.dispatchReminders(async () => {})).accepted, 1);
});

test("failed devices retry with backoff while successful devices are never resent", async () => {
  const { api, signIn } = server();
  const scope = await signIn();
  api.registerDevice(scope, secret, subscription());
  api.registerDevice(scope, secondSecret, subscription("second"));
  task(api);
  const first = await api.dispatchReminders(async (binding) => {
    if (binding.subscription.endpoint.endsWith("second"))
      throw { statusCode: 429, headers: { "retry-after": "120" } };
  });
  assert.equal(first.accepted, 1);
  assert.equal(first.failed, 1);
  assert.equal(
    (await api.dispatchReminders(async () => assert.fail("backoff"))).accepted,
    0,
  );
  for (const job of api.pushStore.jobs.values())
    for (const delivery of job.targets.values())
      if (delivery.state === "pending") {
        assert.ok(delivery.nextAt > Date.now() + 110000);
        delivery.nextAt = 0;
      }
  let count = 0;
  assert.equal(
    (
      await api.dispatchReminders(async () => {
        count++;
      })
    ).accepted,
    1,
  );
  assert.equal(count, 1);
});

test("expired provider endpoints and expired sessions are removed", async () => {
  const { api, signIn } = server();
  const scope = await signIn();
  api.registerDevice(scope, secret, subscription());
  task(api);
  assert.equal(
    (
      await api.dispatchReminders(async () => {
        throw { statusCode: 410 };
      })
    ).removed,
    1,
  );
  assert.equal(api.pushStore.bindings.size, 0);
  const binding = api.registerDevice(scope, secret, subscription("fresh"));
  binding.expiresAt = Date.now() - 1;
  await api.dispatchReminders(async () => assert.fail("expired session"));
  assert.equal(api.pushStore.bindings.size, 0);
});

test("overlapping dispatch calls do not duplicate provider submissions", async () => {
  const { api, signIn } = server();
  api.registerDevice(await signIn(), secret, subscription());
  task(api);
  let release;
  const first = api.dispatchReminders(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  assert.equal(
    (await api.dispatchReminders(async () => assert.fail("duplicate"))).busy,
    true,
  );
  release();
  assert.equal((await first).accepted, 1);
});

test("dispatch rechecks cancellation immediately before each queued send", async () => {
  const { api, signIn } = server();
  api.registerDevice(await signIn(), secret, subscription());
  const tasks = Array.from({ length: 6 }, () => task(api));
  let count = 0;
  await api.dispatchReminders(async () => {
    count++;
    for (const item of tasks)
      api.setTaskCompleted(owner, item.id, item.version, true);
  });
  assert.equal(count, 1);
});

test("a task waits for a device but newly enabled devices do not replay completed reminders", async () => {
  const { api, signIn } = server();
  const scope = await signIn();
  task(api);
  assert.equal(
    (await api.dispatchReminders(async () => assert.fail("no devices")))
      .accepted,
    0,
  );
  api.registerDevice(scope, secret, subscription());
  assert.equal((await api.dispatchReminders(async () => {})).accepted, 1);
  api.registerDevice(scope, secondSecret, subscription("new"));
  assert.equal(
    (
      await api.dispatchReminders(async () =>
        assert.fail("historical reminder"),
      )
    ).accepted,
    0,
  );
});

test("scheduler authentication fails closed and accepts the configured bearer token", async () => {
  const s = server();
  assert.equal((await s.call(s.api.dispatch, { method: "POST" })).status, 401);
  assert.equal(
    (
      await s.call(s.api.dispatch, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.env.TASK_REMINDER_CRON_SECRET}` },
      })
    ).status,
    200,
  );
  delete s.env.TASK_REMINDER_CRON_SECRET;
  assert.equal((await s.call(s.api.dispatch, { method: "POST" })).status, 503);
});

function worker(
  api,
  { userId = owner, offline = false, taskChanges = {} } = {},
) {
  const shown = [];
  const cache = new Map();
  const destinations = [];
  const scope = {
    location: { origin: "https://fieldkit.test" },
    caches: {
      open: async () => ({
        match: async (url) => cache.get(url)?.clone(),
        put: async (url, response) => {
          cache.set(url, response);
        },
      }),
    },
    registration: {
      showNotification: async (title, options) =>
        shown.push({ title, ...options }),
    },
    fetch: async (url) => {
      if (offline) throw new TypeError("offline");
      if (url === "/api/auth/session")
        return userId
          ? Response.json({ user: { id: userId } })
          : Response.json({}, { status: 401 });
      return Response.json({
        userId,
        title: "Private title",
        completed: false,
        deletedAt: null,
        reminderAt: payload.reminderAt,
        ...taskChanges,
      });
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url) => destinations.push(url),
    },
  };
  const payload = {
    kind: "task-reminder",
    userId: owner,
    taskId: crypto.randomUUID(),
    reminderAt: Date.now() - 1000,
    expiresAt: Date.now() + 60000,
  };
  return { api, scope, payload, shown, destinations };
}

test("worker displays a validated task reminder and uses only its safe task destination", async () => {
  const w = worker(server().api);
  await w.api.displayTaskReminder(w.scope, w.payload);
  assert.equal(w.shown[0].body, "Private title");
  assert.ok(w.shown[0].tag.startsWith("fieldkit-task:"));
  await w.api.openTaskReminder(w.scope, {
    ...w.payload,
    url: "https://evil.test",
  });
  assert.ok(
    w.destinations[0].startsWith(
      "https://fieldkit.test/reminders/open?taskId=",
    ),
  );
});

test("worker suppresses signed-out, different-account, cancelled and expired reminders", async () => {
  for (const options of [
    { userId: null },
    { userId: other },
    { taskChanges: { completed: true } },
    { taskChanges: { reminderAt: null } },
  ]) {
    const w = worker(server().api, options);
    await w.api.displayTaskReminder(w.scope, w.payload);
    assert.equal(w.shown.length, 0);
  }
  const w = worker(server().api);
  await w.api.displayTaskReminder(w.scope, { ...w.payload, expiresAt: 1 });
  await w.api.displayTaskReminder(w.scope, { taskId: "invalid" });
  assert.equal(w.shown.length, 0);
});

test("offline worker uses generic text and honors the most recent account marker", async () => {
  const w = worker(server().api, { offline: true });
  await w.api.recordPushAccount(w.scope, owner);
  await w.api.displayTaskReminder(w.scope, w.payload);
  assert.equal(w.shown[0].body.includes("Private"), false);
  await w.api.recordPushAccount(w.scope, null);
  await w.api.displayTaskReminder(w.scope, w.payload);
  await w.api.recordPushAccount(w.scope, other);
  await w.api.displayTaskReminder(w.scope, w.payload);
  assert.equal(w.shown.length, 1);
});

test("notification click focuses a same-origin client before opening a new window", async () => {
  const w = worker(server().api);
  let focused = false;
  let destination;
  w.scope.clients.matchAll = async () => [
    {
      url: "https://fieldkit.test/tasks",
      navigate: async (url) => {
        destination = url;
        return {
          focus: async () => {
            focused = true;
          },
        };
      },
    },
  ];
  await w.api.openTaskReminder(w.scope, w.payload);
  assert.equal(focused, true);
  assert.ok(destination.includes(w.payload.taskId));
  assert.equal(w.destinations.length, 0);
});

test(
  "scheduler runner calls the dispatcher with bearer authorization and shuts down cleanly",
  { timeout: 10000 },
  async () => {
    const cronSecret = randomBytes(32).toString("hex");
    let resolveRequest;
    const requestReceived = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const http = createServer((request, response) => {
      resolveRequest({
        path: request.url,
        method: request.method,
        authorization: request.headers.authorization,
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ accepted: 1, failed: 0, removed: 0 }));
    });
    http.listen(0, "127.0.0.1");
    await once(http, "listening");
    const child = spawn(
      process.execPath,
      ["scripts/task-reminders-runner.mjs"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
          TASK_REMINDER_CRON_SECRET: cronSecret,
          TASK_REMINDER_ORIGIN: `http://127.0.0.1:${http.address().port}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const exit = once(child, "exit");
    try {
      const request = await Promise.race([
        requestReceived,
        exit.then(() => {
          throw Error(`Runner exited before dispatch: ${output}`);
        }),
      ]);
      assert.equal(request.path, "/api/internal/task-reminders");
      assert.equal(request.method, "POST");
      assert.equal(request.authorization, `Bearer ${cronSecret}`);
      child.kill("SIGTERM");
      const [code] = await exit;
      assert.equal(code, 0);
      assert.equal(output.includes(cronSecret), false);
    } finally {
      child.kill("SIGTERM");
      await new Promise((resolve) => http.close(resolve));
    }
  },
);
