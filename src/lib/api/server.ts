import "server-only";

import { z } from "zod";
import { AttachmentInputError } from "@/lib/attachments/input";
import { getCurrentUser } from "@/lib/auth/session";
import { validationFields } from "@/lib/forms/validation";
import { simulateApiDelay } from "./delay";
import { ApiError } from "./errors";

export const privateHeaders = { "Cache-Control": "private, no-store" };
export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(request.url).origin)
  )
    throw new ApiError("This request must come from FieldKit.", 403);
}
export async function apiRoute(
  request: Request,
  operation: () => unknown | Promise<unknown>,
) {
  try {
    await simulateApiDelay();
    if (!["GET", "HEAD"].includes(request.method)) checkOrigin(request);
    if (!(await getCurrentUser()))
      throw new ApiError("Sign in to continue.", 401);
    return jsonResponse(await operation());
  } catch (error) {
    return apiFailure(error);
  }
}
export function apiFailure(error: unknown) {
  if (error instanceof z.ZodError)
    return jsonResponse(
      {
        error: "Please check the form values.",
        fields: validationFields(error),
      },
      400,
    );
  if (error instanceof AttachmentInputError)
    return jsonResponse({ error: error.message }, 400);
  if (error instanceof ApiError)
    return jsonResponse({ error: error.message }, error.status);
  return jsonResponse(
    { error: "Unable to complete this request. Please try again." },
    500,
  );
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Send a valid JSON request body.");
  }
}
