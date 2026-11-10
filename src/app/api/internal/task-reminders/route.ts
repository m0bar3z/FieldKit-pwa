import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/errors";
import { apiFailure, jsonResponse } from "@/lib/api/server";
import { dispatchReminders } from "@/lib/push/dispatch";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const secret = process.env.TASK_REMINDER_CRON_SECRET;
    if (!secret || secret.length < 32)
      throw new ApiError("Reminder scheduling is not configured.", 503);
    const hash = (value: string) => createHash("sha256").update(value).digest();
    if (
      !timingSafeEqual(
        hash(request.headers.get("authorization") ?? ""),
        hash(`Bearer ${secret}`),
      )
    )
      throw new ApiError("Scheduler authorization required.", 401);
    return jsonResponse(await dispatchReminders());
  } catch (error) {
    return apiFailure(error);
  }
}
