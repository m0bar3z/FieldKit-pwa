import "server-only";

import { createECDH } from "node:crypto";
import { ApiError } from "@/lib/api/errors";

export function pushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "";
  const cronSecret = process.env.TASK_REMINDER_CRON_SECRET ?? "";
  try {
    if (!/^[\w-]{87}$/.test(publicKey) || !/^[\w-]{43}$/.test(privateKey))
      throw new Error("Invalid keys");
    const key = createECDH("prime256v1");
    key.setPrivateKey(Buffer.from(privateKey, "base64url"));
    if (key.getPublicKey().toString("base64url") !== publicKey)
      throw new Error("Mismatched keys");
    const contact = new URL(subject);
    if (
      !["mailto:", "https:"].includes(contact.protocol) ||
      !contact.pathname ||
      contact.hostname === "localhost" ||
      cronSecret.length < 32
    )
      throw new Error("Invalid configuration");
  } catch {
    throw new ApiError(
      "Task reminders are not configured on this server.",
      503,
    );
  }
  return { publicKey, privateKey, subject, cronSecret };
}
export function publicPushConfig() {
  try {
    return { configured: true, publicKey: pushConfig().publicKey };
  } catch {
    return { configured: false, publicKey: "" };
  }
}
