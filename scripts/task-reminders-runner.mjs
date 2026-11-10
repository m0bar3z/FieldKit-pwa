// Matches Next.js environment precedence without adding a package.
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(
  process.cwd(),
  process.env.NODE_ENV !== "production",
);

const origin = new URL(
  process.env.TASK_REMINDER_ORIGIN ?? "http://localhost:3000",
);
const secret = process.env.TASK_REMINDER_CRON_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    "Set TASK_REMINDER_CRON_SECRET to at least 32 random characters.",
  );
if (
  !["http:", "https:"].includes(origin.protocol) ||
  origin.username ||
  origin.password ||
  (origin.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
)
  throw new Error(
    "TASK_REMINDER_ORIGIN must use HTTPS (HTTP is allowed on localhost).",
  );
const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => shutdown.abort());
process.stdout.write(
  "Task reminder scheduler started; checking every minute.\n",
);
while (!shutdown.signal.aborted) {
  const started = Date.now();
  try {
    const response = await fetch(
      new URL("/api/internal/task-reminders", origin),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(55000)]),
        redirect: "error",
      },
    );
    if (!response.ok)
      console.error(
        `Reminder dispatch failed (HTTP ${response.status}). Check server configuration.`,
      );
    else {
      const result = await response.json();
      if (result.accepted || result.failed || result.removed)
        process.stdout.write(
          `Reminders: ${result.accepted} accepted, ${result.failed} failed, ${result.removed} expired subscriptions removed.\n`,
        );
    }
  } catch {
    if (!shutdown.signal.aborted)
      console.error(
        "Unable to reach the reminder dispatcher. Check the server and origin.",
      );
  }
  await delay(Math.max(1000, 60000 - (Date.now() - started)), undefined, {
    signal: shutdown.signal,
  }).catch(() => {});
}
