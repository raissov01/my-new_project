import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type SendMessageResponse = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
};

type HistoryResponse = {
  messages: ChatMessage[];
};

// POST /api/chat — send a message
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message || message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be 1-5000 characters" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchBackendJson<SendMessageResponse>({
      path: "/api/v1/chat/message",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ message }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[chat] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// GET /api/chat — get history
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchBackendJson<HistoryResponse>({
      path: "/api/v1/chat/history",
      userId: user.id,
    });

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[chat] GET error:", msg);
    return NextResponse.json({ messages: [] });
  }
}

// DELETE /api/chat — clear history
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchBackendJson<{ ok: boolean }>({
      path: "/api/v1/chat/history",
      userId: user.id,
      method: "DELETE",
    });

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[chat] DELETE error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
