#!/usr/bin/env tsx
/**
 * OpenAI TTS Audio Generator for Listening Clips
 *
 * Fetches all listening clips from the backend, generates MP3 audio via
 * OpenAI TTS for each clip's transcript, and saves to:
 *   frontend/public/audio/listening/{filename}.mp3
 *
 * Usage:
 *   npx tsx scripts/generate-tts-audio.ts
 *
 * Options:
 *   --dry-run       Print what would be generated without calling the API
 *   --level=B1      Only generate clips for this CEFR level
 *   --force         Re-generate even if the file already exists
 *   --voice=nova    OpenAI TTS voice (default: alloy)
 *
 * Requires env vars:
 *   OPENAI_API_KEY
 *   BACKEND_URL         (default: http://localhost:5000)
 *   BACKEND_INTERNAL_TOKEN
 *
 * Voice options: alloy | echo | fable | onyx | nova | shimmer
 * Voice recommendations per level:
 *   A1-A2 → nova    (clear, friendly, slower-sounding)
 *   B1-B2 → alloy   (neutral, professional)
 *   C1-C2 → onyx    (authoritative, measured)
 */

import * as fs from "fs";
import * as path from "path";

// ── CLI args ─────────────────────────────────────────────────────────────────

const isDryRun  = process.argv.includes("--dry-run");
const isForce   = process.argv.includes("--force");
const levelArg  = process.argv.find((a) => a.startsWith("--level="))?.split("=")[1];
const voiceArg  = (process.argv.find((a) => a.startsWith("--voice="))?.split("=")[1] ?? "") as TTSVoice;

type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

const LEVEL_VOICES: Record<string, TTSVoice> = {
  A1: "nova",
  A2: "nova",
  B1: "alloy",
  B2: "alloy",
  C1: "onyx",
  C2: "onyx",
};

// OpenAI TTS caps input at 4096 characters; split longer transcripts.
const MAX_TTS_CHARS = 4000;

// ── Config ───────────────────────────────────────────────────────────────────

const OPENAI_API_KEY      = process.env.OPENAI_API_KEY ?? "";
const BACKEND_URL         = process.env.BACKEND_URL ?? "http://localhost:5000";
const BACKEND_TOKEN       = process.env.BACKEND_INTERNAL_TOKEN ?? "";
const OUTPUT_DIR          = path.join(process.cwd(), "frontend", "public", "audio", "listening");

if (!isDryRun && !OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is required");
  process.exit(1);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Clip {
  id: string;
  title: string;
  level: string;
  audioUrl: string;   // e.g. "/audio/listening/a1_greetings.mp3"
  transcript: string;
  durationSeconds: number;
}

// ── Fetch clips from backend ─────────────────────────────────────────────────

async function fetchClips(): Promise<Clip[]> {
  const qs = levelArg ? `?level=${levelArg}` : "";
  const res = await fetch(`${BACKEND_URL}/api/v1/listening/clips${qs}`, {
    headers: {
      Authorization: `Bearer ${BACKEND_TOKEN}`,
      "X-User-ID": "script",
    },
  });
  if (!res.ok) {
    throw new Error(`Backend responded ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as { clips: Clip[] };
  return data.clips ?? [];
}

// ── OpenAI TTS ───────────────────────────────────────────────────────────────

async function generateAudio(text: string, voice: TTSVoice): Promise<Buffer> {
  // Truncate to OpenAI limit
  const input = text.length > MAX_TTS_CHARS ? text.slice(0, MAX_TTS_CHARS) : text;

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",          // tts-1-hd for higher quality (2× cost)
      input,
      voice,
      response_format: "mp3",
      speed: 0.95,             // slightly slower for learners
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error ${res.status}: ${err}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ── Cost estimate ────────────────────────────────────────────────────────────

function estimateCost(clips: Clip[]): void {
  const totalChars = clips.reduce((sum, c) => sum + Math.min(c.transcript.length, MAX_TTS_CHARS), 0);
  // tts-1: $0.015 per 1000 characters
  const cost = (totalChars / 1000) * 0.015;
  console.log(`\nCost estimate: ${totalChars.toLocaleString()} chars → $${cost.toFixed(3)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching clips from backend…");
  const clips = await fetchClips();

  if (clips.length === 0) {
    console.log("No clips found. Is the backend running with DB seeded?");
    return;
  }

  console.log(`Found ${clips.length} clip(s)${levelArg ? ` at ${levelArg}` : ""}\n`);
  estimateCost(clips);

  if (isDryRun) {
    console.log("\n[DRY RUN] Would generate:\n");
    clips.forEach((c) => {
      const filename = path.basename(c.audioUrl);
      const filePath = path.join(OUTPUT_DIR, filename);
      const exists   = fs.existsSync(filePath);
      const voice    = voiceArg || LEVEL_VOICES[c.level] || "alloy";
      console.log(`  ${exists ? "SKIP (exists)" : "GENERATE  "} ${filename}  [${c.level}, voice=${voice}, ${c.transcript.length} chars]`);
    });
    return;
  }

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let generated = 0;
  let skipped   = 0;
  let failed    = 0;

  for (const clip of clips) {
    const filename = path.basename(clip.audioUrl);
    const filePath = path.join(OUTPUT_DIR, filename);

    if (!isForce && fs.existsSync(filePath)) {
      console.log(`  SKIP  ${filename}`);
      skipped++;
      continue;
    }

    const voice = voiceArg || LEVEL_VOICES[clip.level] || "alloy";

    process.stdout.write(`  GEN   ${filename}  [${clip.level}, ${voice}]  …`);

    try {
      const audio = await generateAudio(clip.transcript, voice);
      fs.writeFileSync(filePath, audio);
      const kb = (audio.length / 1024).toFixed(0);
      console.log(` ✓  ${kb} KB`);
      generated++;

      // Small delay to avoid rate limits (3 req/min for tts-1 on free tier)
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.log(` ✗  ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
