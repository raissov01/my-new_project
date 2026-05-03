import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = req.nextUrl.searchParams.get("limit") ?? "20";

  try {
    const data = await fetchBackendJson<unknown>({
      path: `/api/v1/notifications?limit=${encodeURIComponent(limit)}`,
      userId: user.id,
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[notifications] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
