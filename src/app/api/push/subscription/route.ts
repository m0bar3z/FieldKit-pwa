import { ApiError } from "@/lib/api/errors";
import { apiRoute, readJson } from "@/lib/api/server";
import { getCurrentSession } from "@/lib/auth/session";
import { publicPushConfig, pushConfig } from "@/lib/push/config";
import { deviceSecretSchema, registrationSchema } from "@/lib/push/schemas";
import { deviceBinding, registerDevice, removeDevice } from "@/lib/push/store";

async function sessionScope(userId: string) {
  const session = await getCurrentSession();
  if (!session || session.user.id !== userId)
    throw new ApiError("Sign in to enable reminders.", 401);
  return { userId, sessionId: session.sessionId, expiresAt: session.expiresAt };
}
export async function GET(request: Request) {
  return apiRoute(request, async (user) => {
    const session = await sessionScope(user.id);
    const secret = deviceSecretSchema.parse(
      request.headers.get("X-FieldKit-Device"),
    );
    const binding = deviceBinding(session, secret);
    return {
      ...publicPushConfig(),
      subscribed: !!binding,
      endpoint: binding?.subscription.endpoint ?? null,
    };
  });
}
export async function POST(request: Request) {
  return apiRoute(request, async (user) => {
    pushConfig();
    const input = registrationSchema.parse(await readJson(request));
    registerDevice(
      await sessionScope(user.id),
      input.deviceSecret,
      input.subscription,
    );
    return { success: "Task reminders enabled on this device." };
  });
}
export async function DELETE(request: Request) {
  return apiRoute(request, async (user) => {
    const secret = deviceSecretSchema.parse(
      request.headers.get("X-FieldKit-Device"),
    );
    removeDevice(await sessionScope(user.id), secret);
    return { success: "Task reminders disabled on this device." };
  });
}
