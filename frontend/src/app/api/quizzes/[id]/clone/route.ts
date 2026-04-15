import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CloneRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: CloneRouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await fetchBackendJson<{ id: string }>({
      path: `/api/v1/quizzes/${encodeURIComponent(id)}/clone`,
      userId: user.id,
      method: "POST",
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[quizzes] clone error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
