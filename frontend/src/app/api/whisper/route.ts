import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // OpenAI limit

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "TTS not configured" }, { status: 503 });

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

  const whisperForm = new FormData();
  whisperForm.append("file", file, "audio.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "en");
  whisperForm.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: whisperForm,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Whisper error: ${err}` }, { status: 502 });
  }

  const data = await res.json() as { text: string };
  return NextResponse.json({ text: data.text ?? "" });
}
