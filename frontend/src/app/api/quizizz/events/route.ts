import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.text();

  try {
    const data = await fetchBackendJson<{ ok: boolean; id?: string }>({
      path: "/api/v1/quizizz/events",
      userId: user?.id ?? "",
      method: "POST",
      body,
      headers: { "Content-Type": req.headers.get("content-type") ?? "application/json" },
      timeoutMs: 5_000,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to record event";
    console.error("[quizizz-events] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
