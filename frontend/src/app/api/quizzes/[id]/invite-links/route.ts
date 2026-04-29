import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const data = await fetchBackendJson<{ token: string }>({
      path: `/api/v1/quizzes/${encodeURIComponent(id)}/invite-links`,
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ max_uses: body.maxUses ?? null }),
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(_req: NextRequest, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = await fetchBackendJson<{ items: unknown[] }>({
      path: `/api/v1/quizzes/${encodeURIComponent(id)}/invite-links`,
      userId: user.id,
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
