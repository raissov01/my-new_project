import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AIQuizGenerateResponse = {
  questions: Array<{
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  meta: {
    model: string;
    generatedCount: number;
    remainingToday: number;
  };
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();

  try {
    const data = await fetchBackendJson<AIQuizGenerateResponse>({
      path: "/api/v1/quizzes/ai-generate",
      userId: user.id,
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[quizzes/ai-generate] POST error:", msg);

    if (msg.includes("429") || msg.toLowerCase().includes("daily generation limit")) {
      return NextResponse.json({ error: "DAILY_LIMIT_REACHED" }, { status: 429 });
    }

    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
