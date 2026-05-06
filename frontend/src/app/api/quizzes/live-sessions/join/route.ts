import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quizzes/live-sessions/join — student joins by code
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  // user may be null for anonymous players — still allowed

  const body = await req.text();

  try {
    const data = await fetchBackendJson<{
      participantId: string;
      sessionId: string;
      displayName: string;
      quizTitle: string;
      mode: string;
      totalQuestions: number;
      teamMode: boolean;
      teamId: number;
    }>({
      path: "/api/v1/live-sessions/join",
      userId: user?.id ?? "",
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend error";
    const status = msg.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
