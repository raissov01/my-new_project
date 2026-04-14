import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();

  try {
    const data = await fetchBackendJson<{ id: string }>({
      path: "/api/v1/quizzes",
      userId: user.id,
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[quizzes] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
