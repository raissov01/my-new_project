import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import type { AttemptResult } from "@/server/services/quizzes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AttemptsRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: AttemptsRouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.text();
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(`quiz_invite_${id}`)?.value;

  try {
    const data = await fetchBackendJson<AttemptResult>({
      path: `/api/v1/quizzes/${encodeURIComponent(id)}/attempts`,
      userId: user.id,
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        ...(inviteToken ? { "X-Invite-Token": inviteToken } : {}),
      },
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[quizzes] POST attempt error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
