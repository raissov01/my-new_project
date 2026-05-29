import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendRaw } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio too large (max 25 MB)" }, { status: 413 });
  }

  const proxyForm = new FormData();
  proxyForm.append("audio", file, file.name || "audio.webm");

  const { status, body, headers } = await fetchBackendRaw({
    path: "/api/v1/speech/transcribe",
    userId: user.id,
    method: "POST",
    body: proxyForm,
  });

  return new Response(body, { status, headers });
}
