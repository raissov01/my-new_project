#!/usr/bin/env tsx
/**
 * Question Bank AI Expansion Pipeline
 *
 * Usage:
 *   npx tsx scripts/generate-questions.ts --level=A2 --category=vocabulary --format=fill_blank --count=20
 *
 * Output: seed/generated/{level}_{category}_{format}_{timestamp}.json
 *
 * Requires env: OPENAI_API_KEY (optionally ANTHROPIC_API_KEY as fallback)
 */

import * as fs from "fs";
import * as path from "path";

// ── CLI args ────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const flag = `--${name}=`;
  return process.argv.find((a) => a.startsWith(flag))?.slice(flag.length);
}

const level    = getArg("level")    ?? "B1";
const category = getArg("category") ?? "vocabulary"; // vocabulary | grammar
const format   = getArg("format")   ?? "fill_blank";  // fill_blank | multiple_choice | true_false
const count    = parseInt(getArg("count") ?? "20", 10);

console.log(`Generating ${count} ${format} questions at ${level} (${category})…`);

// ── Output schema ────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  level: string;
  category: string;
  format: string;
  prompt: string;
  correctAnswer: string;
  distractors?: string[];
  explanation?: string;
  reviewed: boolean;
}

// ── System prompt ────────────────────────────────────────────────────────────

const TOPICS = [
  "family", "food", "travel", "work", "hobbies",
  "technology", "weather", "health", "environment", "culture",
];

function buildSystemPrompt(): string {
  return `You are an English language question generator for CEFR level ${level}.
Generate ${count} ${format} questions for the topic area: ${category}.
Topics rotate across: ${TOPICS.join(", ")}.

Rules:
- Vocabulary questions test word meaning, usage, and collocation.
- Grammar questions test structure at ${level} level.
- For fill_blank: provide a sentence with one blank (___) and the correct answer.
- For multiple_choice: provide 1 correct answer + 3 plausible distractors.
- For true_false: provide a statement and whether it is true or false.
- Avoid cultural bias. Use neutral, globally recognisable contexts.
- Do not repeat prompts.
- For ${level}: ${level.startsWith("A") ? "use simple, everyday vocabulary and short sentences" : level.startsWith("B") ? "use intermediate vocabulary with some idiomatic expressions" : "use advanced vocabulary, complex structures, and idiomatic language"}.

Return ONLY a JSON array matching this TypeScript interface:
interface Q {
  prompt: string;          // the question text or sentence with ___
  correctAnswer: string;   // the correct answer
  distractors?: string[];  // for multiple_choice: exactly 3 wrong options
  explanation?: string;    // brief explanation (optional)
}

Example for fill_blank at B1:
[{"prompt":"She decided to ___ her old job and start her own business.","correctAnswer":"quit","distractors":["fire","hire","resign"],"explanation":"'quit' means to leave a job voluntarily"}]`;
}

// ── OpenAI API call ──────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate exactly ${count} questions now.` },
      ],
      temperature: 0.9,
      max_tokens: Math.min(4096, count * 200),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

// ── Anthropic fallback ───────────────────────────────────────────────────────

async function callAnthropic(systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      system: systemPrompt,
      messages: [{ role: "user", content: `Generate exactly ${count} questions now.` }],
      max_tokens: Math.min(4096, count * 200),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
  };
  return data.content.find((c) => c.type === "text")?.text ?? "";
}

// ── Parse JSON from AI response ──────────────────────────────────────────────

function extractJSON(raw: string): unknown[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in response");
  return JSON.parse(raw.slice(start, end + 1)) as unknown[];
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const systemPrompt = buildSystemPrompt();

  let raw: string;
  try {
    raw = await callOpenAI(systemPrompt);
    console.log("✓ Used OpenAI");
  } catch (e) {
    console.warn(`OpenAI failed (${(e as Error).message}), trying Anthropic…`);
    raw = await callAnthropic(systemPrompt);
    console.log("✓ Used Anthropic fallback");
  }

  const parsed = extractJSON(raw) as Array<{
    prompt: string;
    correctAnswer: string;
    distractors?: string[];
    explanation?: string;
  }>;

  const questions: GeneratedQuestion[] = parsed.map((q) => ({
    level,
    category,
    format,
    prompt: q.prompt,
    correctAnswer: q.correctAnswer,
    distractors: q.distractors,
    explanation: q.explanation,
    reviewed: false,
  }));

  // ── Write output ──────────────────────────────────────────────────────────
  const outDir = path.join(process.cwd(), "seed", "generated");
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${level}_${category}_${format}_${timestamp}.json`;
  const outPath = path.join(outDir, filename);

  fs.writeFileSync(outPath, JSON.stringify(questions, null, 2));
  console.log(`✓ Wrote ${questions.length} questions → ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
