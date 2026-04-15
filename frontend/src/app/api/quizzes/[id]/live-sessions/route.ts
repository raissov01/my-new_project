import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quizzes/:id/live-sessions — host creates a live session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.text();

  try {
    const data = await fetchBackendJson<{
      id: string;
      joinCode: string;
      mode: string;
      quizTitle: string;
    }>({
      path: `/api/v1/quizzes/${id}/live-sessions`,
      userId: user.id,
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
