import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import {
  getBackendBaseUrl,
  getBackendInternalToken,
} from "@/server/integrations/go-backend/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forwards a multipart file upload to the Go backend's quiz-image endpoint.
// We bypass fetchBackendJson here because it's JSON-only; this route streams
// the raw multipart body through with the internal auth header attached.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = getBackendBaseUrl();
  const internalToken = getBackendInternalToken();
  if (!baseUrl || !internalToken) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 500 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data required" },
      { status: 400 }
    );
  }

  const body = await req.arrayBuffer();

  try {
    const response = await fetch(`${baseUrl}/api/v1/quizzes/images`, {
      method: "POST",
      body,
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "X-User-ID": user.id,
        "Content-Type": contentType,
      },
    });

    const data = (await response.json().catch(() => null)) as
      | { url?: string; name?: string; error?: string }
      | null;

    if (!response.ok || !data?.url) {
      return NextResponse.json(
        { error: data?.error ?? "upload failed" },
        { status: response.status || 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend request failed";
    console.error("[quizzes] image upload error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
