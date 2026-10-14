import { apiRoute } from "@/lib/api/server";
import { getWorkspace } from "@/lib/products/queries";

export async function GET(request: Request) {
  return apiRoute(request, () =>
    getWorkspace(
      new URL(request.url).searchParams.get("timeZone") ?? undefined,
    ),
  );
}
