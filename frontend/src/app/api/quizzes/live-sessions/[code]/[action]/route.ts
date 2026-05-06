import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["force-next", "pause", "resume", "kick", "end"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; action: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code, action } = await params;
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }

  const body = await req.text();

  try {
    const data = await fetchBackendJson<Record<string, unknown>>({
      path: `/api/v1/live-sessions/${encodeURIComponent(code)}/${action}`,
      userId: user.id,
      method: "POST",
      body: body || "{}",
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
