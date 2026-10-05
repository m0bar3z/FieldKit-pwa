/** biome-ignore-all lint/style/noNonNullAssertion: <> */
"use server";

import webpush, {
  type PushSubscription as WebPushSubscription,
} from "web-push";
import { requireUser } from "@/lib/auth";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// Keep this prototype in memory, but isolate subscriptions by verified identity.
const subscriptions = new Map<string, WebPushSubscription>();

export async function subscribeUser(sub: WebPushSubscription) {
  const user = await requireUser();
  if (
    !sub ||
    typeof sub.endpoint !== "string" ||
    !sub.keys ||
    typeof sub.keys.auth !== "string" ||
    typeof sub.keys.p256dh !== "string"
  ) {
    throw new Error("Invalid push subscription");
  }
  const endpoint = new URL(sub.endpoint);
  // Allow established browser push services, not arbitrary URLs supplied to the server.
  const allowedHosts = [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
  ];
  if (
    endpoint.protocol !== "https:" ||
    !allowedHosts.includes(endpoint.hostname) ||
    endpoint.port ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error("Unsupported push endpoint");
  }
  subscriptions.set(user.id, sub);
  // In a production environment, you would want to store the subscription in a database
  // For example: await db.subscriptions.create({ data: sub })
  return { success: true };
}

export async function unsubscribeUser() {
  const user = await requireUser();
  subscriptions.delete(user.id);
  // In a production environment, you would want to remove the subscription from the database
  // For example: await db.subscriptions.delete({ where: { ... } })
  return { success: true };
}

export async function sendNotification(message: string) {
  const user = await requireUser();
  const subscription = subscriptions.get(user.id);
  if (typeof message !== "string" || !message.trim() || message.length > 2000) {
    throw new Error(
      "Notification message must be between 1 and 2000 characters",
    );
  }
  if (!subscription) {
    throw new Error("No subscription available");
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Test Notification",
        body: message,
        icon: "/icon.png",
      }),
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
