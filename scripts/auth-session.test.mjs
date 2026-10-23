import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { SignJWT } from "jose";

const secret = "fieldkit-test-session-secret-at-least-32-bytes";
const demoId = "fieldkit-demo-user";

const bundle = await build({
  stdin: {
    contents:
      "export { createSession, userFromSession, SESSION_SECONDS } from './src/lib/auth/session';",
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "iife",
  globalName: "sessions",
  plugins: [
    {
      name: "request-context",
      setup(plugin) {
        plugin.onResolve(
          { filter: /^(server-only|react|next\/headers|next\/navigation)$/ },
          () => ({ path: "context", namespace: "test" }),
        );
        plugin.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `
        export const cache = (fn) => fn;
        export const cookies = async () => ({ get: () => undefined });
        export const redirect = () => { throw new Error('Redirect'); };
      `,
        }));
      },
    },
  ],
});

function server(signingSecret = secret) {
  const env = { NODE_ENV: "production", SESSION_SECRET: signingSecret };
  const clock = { now: Date.now() };
  const context = vm.createContext({
    require: createRequire(import.meta.url),
    process: { env },
    crypto,
    CryptoKey,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    structuredClone,
    btoa,
    atob,
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [clock.now]));
      }
      static now() {
        return clock.now;
      }
    },
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  return { api: context.sessions, env, clock };
}

test("a signed session verifies in independent server instances and after a restart", async () => {
  const first = server();
  const token = await first.api.createSession(demoId);
  for (let instance = 0; instance < 3; instance += 1) {
    const user = await server().api.userFromSession(token);
    assert.deepEqual({ ...user }, { id: demoId, email: "demo@fieldkit.app" });
  }
  const secondToken = await server().api.createSession(
    "fieldkit-second-demo-user",
  );
  assert.equal(
    (await first.api.userFromSession(secondToken)).email,
    "second@fieldkit.app",
  );
});

test("session cookies expire after seven days and new sign-ins produce new tokens", async () => {
  const { api, clock } = server();
  const token = await api.createSession(demoId);
  assert.notEqual(await api.createSession(demoId), token);
  clock.now += api.SESSION_SECONDS * 1000 - 1000;
  assert.equal((await api.userFromSession(token)).id, demoId);
  clock.now += 2000;
  assert.equal(await api.userFromSession(token), null);
});

test("changed user IDs, signatures, malformed cookies, and legacy random tokens are rejected", async () => {
  const { api } = server();
  const token = await api.createSession(demoId);
  const [header, body, signature] = token.split(".");
  const payload = JSON.parse(Buffer.from(body, "base64url"));
  payload.sub = "fieldkit-second-demo-user";
  const changedBody = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const changedSignature =
    (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  for (const invalid of [
    undefined,
    "",
    "malformed",
    "a".repeat(64),
    `${header}.${changedBody}.${signature}`,
    `${header}.${body}.${changedSignature}`,
  ]) {
    assert.equal(await api.userFromSession(invalid), null);
  }
});

test("unknown accounts, wrong audience or issuer, wrong algorithms, and missing expiration are rejected", async () => {
  const { api } = server();
  assert.equal(
    await api.userFromSession(await api.createSession("unknown-user")),
    null,
  );
  const key = new TextEncoder().encode(secret);
  for (const options of [
    { issuer: "other" },
    { audience: "other" },
    { algorithm: "HS384" },
    { expires: false },
  ]) {
    let jwt = new SignJWT({})
      .setProtectedHeader({ alg: options.algorithm ?? "HS256" })
      .setSubject(demoId)
      .setIssuer(options.issuer ?? "fieldkit")
      .setAudience(options.audience ?? "fieldkit-demo")
      .setIssuedAt()
      .setJti(crypto.randomUUID());
    if (options.expires !== false) jwt = jwt.setExpirationTime("7d");
    assert.equal(await api.userFromSession(await jwt.sign(key)), null);
  }
});

test("changing the signing secret invalidates old sessions", async () => {
  const { api, env } = server();
  const token = await api.createSession(demoId);
  env.SESSION_SECRET = "a-different-test-session-secret-at-least-32-bytes";
  assert.equal(await api.userFromSession(token), null);
  assert.equal(
    (await api.userFromSession(await api.createSession(demoId))).id,
    demoId,
  );
});

test("missing or short secrets cannot create sessions", async () => {
  for (const invalid of ["", "short"]) {
    await assert.rejects(
      server(invalid).api.createSession(demoId),
      /SESSION_SECRET/,
    );
  }
});
