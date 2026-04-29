import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ token: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  try {
    await fetchBackendJson({
      path: `/api/v1/quiz-invite/${encodeURIComponent(token)}`,
      userId: user.id,
      method: "DELETE",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
