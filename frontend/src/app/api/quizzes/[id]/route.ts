import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QuizRouteProps {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: QuizRouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.text();

  try {
    await fetchBackendJson({
      path: `/api/v1/quizzes/${encodeURIComponent(id)}`,
      userId: user.id,
      method: "PUT",
      body,
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[quizzes] PUT error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
