import "server-only";

import { ECDH } from "node:crypto";
import { z } from "zod";

function validEncryptionKey(value: string) {
  try {
    const bytes = Buffer.from(value, "base64url");
    return (
      bytes.length === 65 && ECDH.convertKey(bytes, "prime256v1").length === 65
    );
  } catch {
    return false;
  }
}

export const deviceSecretSchema = z.string().regex(/^[0-9a-f]{64}$/);
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      (host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host.endsWith(".push.services.mozilla.com") ||
        host === "web.push.apple.com" ||
        host.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
export const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine(allowedPushEndpoint, "Unsupported push service."),
  expirationTime: z
    .number()
    .int()
    .positive()
    .max(8640000000000000)
    .nullable()
    .optional(),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^B[A-Za-z0-9_-]{86}={0,1}$/)
      .refine(validEncryptionKey, "Invalid push encryption key."),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});
export const registrationSchema = z.object({
  deviceSecret: deviceSecretSchema,
  subscription: subscriptionSchema,
});
export type DeviceSubscription = z.infer<typeof subscriptionSchema>;
