import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendRaw } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { text?: string; voice?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const { status, body: audioBody, headers } = await fetchBackendRaw({
    path: "/api/v1/speech/tts",
    userId: user.id,
    method: "POST",
    body: JSON.stringify({ text, voice: body.voice ?? "nova" }),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });

  return new Response(audioBody, { status, headers });
}
