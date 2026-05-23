import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import {
  BackendError,
  fetchBackendJson,
} from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { text?: string; level?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const level = typeof body.level === "string" ? body.level : "B1";

  if (!text || text.length < 20) {
    return NextResponse.json({ error: "Text too short" }, { status: 400 });
  }

  try {
    const data = await fetchBackendJson<{ words: unknown[] }>({
      path: "/api/v1/mining/extract",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ text, level }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 60_000,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError && err.status === 402) {
      return NextResponse.json(err.data, { status: 402 });
    }
    const msg = err instanceof Error ? err.message : "Backend error";
    console.error("[mining] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
