"use client";

import { useState, useTransition } from "react";
import { Pickaxe, Loader2, PlusCircle, CheckCircle2, ExternalLink } from "lucide-react";

interface ExtractedWord {
  word: string;
  definition: string;
  example: string;
  topic: string;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

async function extractWords(text: string, level: string): Promise<ExtractedWord[]> {
  try {
    const res = await fetch("/api/mining", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { words?: ExtractedWord[] };
    return data.words ?? [];
  } catch {
    return [];
  }
}

const TOPIC_COLORS: Record<string, { bg: string; color: string }> = {
  business:      { bg: "rgba(245,158,11,0.10)", color: "#d97706" },
  technology:    { bg: "rgba(59,130,246,0.10)",  color: "#3b82f6" },
  environment:   { bg: "rgba(34,197,94,0.10)",   color: "var(--green)" },
  health:        { bg: "rgba(239,68,68,0.10)",    color: "#ef4444" },
  communication: { bg: "rgba(139,92,246,0.10)",  color: "#8b5cf6" },
  general:       { bg: "var(--paper-2)",          color: "var(--ink-mute)" },
};

async function saveWordsToSet(selectedWords: ExtractedWord[], level: string): Promise<string | null> {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  try {
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Mined words · ${level} · ${today}`,
        description: "Vocabulary extracted via Sentence Mining",
        cards: selectedWords.map((w) => ({ term: w.word, definition: w.definition })),
        isPublic: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { setID?: string; id?: string };
    return data.setID ?? data.id ?? null;
  } catch {
    return null;
  }
}

const monoStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace" };

export default function MiningPage() {
  const [text, setText] = useState("");
  const [level, setLevel] = useState<string>("B1");
  const [words, setWords] = useState<ExtractedWord[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [savedSetId, setSavedSetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleExtract = () => {
    if (text.trim().length < 20) { setError("Please paste at least 20 characters."); return; }
    setError("");
    setSavedSetId(null);
    startTransition(async () => {
      const result = await extractWords(text, level);
      setWords(result);
      setAdded(new Set());
    });
  };

  const toggleWord = (word: ExtractedWord) => {
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(word.word)) next.delete(word.word);
      else next.add(word.word);
      return next;
    });
  };

  const handleSaveToFlashcards = async () => {
    const toSave = added.size > 0 ? words.filter((w) => added.has(w.word)) : words;
    if (toSave.length === 0) return;
    setSaving(true);
    const setId = await saveWordsToSet(toSave, level);
    setSaving(false);
    if (setId) setSavedSetId(setId);
  };

  const addAll = () => {
    setAdded(new Set(words.map((w) => w.word)));
  };

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* ─── nd-mock-shell header ─── */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Pickaxe style={{ width: 16, height: 16, color: "var(--ink-mute)" }} />
          <h3>Sentence Mining</h3>
          <span style={monoStyle}>AI vocabulary extractor</span>
        </div>
      </div>

      {/* ─── Input section ─── */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        {/* Section label */}
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 12 }}>
          YOUR LEVEL
        </p>

        {/* Level pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={level === lv ? "nd-lib-pill on" : "nd-lib-pill"}
            >
              {lv}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste any English article, email, or text here (up to 5,000 characters)…"
          rows={8}
          maxLength={5000}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--paper-2)",
            padding: "12px 14px",
            fontSize: 14,
            color: "var(--ink)",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          <p style={{ ...monoStyle, fontSize: 11, color: "var(--ink-mute)" }}>{text.length} / 5,000</p>
          {error && <p style={{ fontSize: 12, color: "var(--terra)" }}>{error}</p>}
          <button
            onClick={handleExtract}
            disabled={isPending || text.trim().length < 20}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 10,
              background: "var(--ink)",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: isPending || text.trim().length < 20 ? "not-allowed" : "pointer",
              opacity: isPending || text.trim().length < 20 ? 0.45 : 1,
            }}
          >
            {isPending ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : <Pickaxe style={{ width: 15, height: 15 }} />}
            Extract vocabulary
          </button>
        </div>
      </div>

      {/* ─── Results ─── */}
      {words.length > 0 && (
        <div>
          {/* Results header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              Found {words.length} words
              {added.size > 0 && (
                <span style={{ ...monoStyle, marginLeft: 10, fontSize: 12, color: "var(--terra)" }}>· {added.size} selected</span>
              )}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {words.some((w) => !added.has(w.word)) && (
                <button
                  onClick={addAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    padding: "7px 14px",
                    fontSize: 13,
                    color: "var(--ink-mute)",
                    cursor: "pointer",
                  }}
                >
                  <PlusCircle style={{ width: 14, height: 14 }} />
                  Select all
                </button>
              )}
              <button
                onClick={handleSaveToFlashcards}
                disabled={saving || savedSetId !== null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 10,
                  background: savedSetId ? "var(--green)" : "var(--terra)",
                  color: "#fff",
                  border: "none",
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving || savedSetId !== null ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                {savedSetId ? "Saved!" : `Save ${added.size > 0 ? added.size : words.length} to flashcards`}
              </button>
            </div>
          </div>

          {savedSetId && (
            <a
              href={`/sets/${savedSetId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(34,197,94,0.08)",
                border: "1px solid var(--green)",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 13,
                color: "var(--green)",
                textDecoration: "none",
                marginBottom: 16,
              }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0 }} />
              Flashcard set created — click to study
              <ExternalLink style={{ width: 13, height: 13, marginLeft: "auto" }} />
            </a>
          )}

          {/* Word cards grid */}
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {words.map((w) => {
              const isAdded = added.has(w.word);
              const topicKey = w.topic?.toLowerCase() ?? "general";
              const topicColor = TOPIC_COLORS[topicKey] ?? TOPIC_COLORS.general;
              return (
                <div
                  key={w.word}
                  style={{
                    background: "var(--paper-2)",
                    border: isAdded ? "1.5px solid var(--terra)" : "1px solid var(--line)",
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, color: "var(--terra)", margin: 0 }}>{w.word}</p>
                    <span
                      style={{
                        borderRadius: 99,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background: topicColor.bg,
                        color: topicColor.color,
                        flexShrink: 0,
                      }}
                    >
                      {w.topic}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: 0, lineHeight: 1.5 }}>{w.definition}</p>
                  <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink-mute)", margin: 0 }}>&ldquo;{w.example}&rdquo;</p>
                  <button
                    onClick={() => toggleWord(w)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      borderRadius: 10,
                      border: isAdded ? "none" : "1px solid var(--line)",
                      background: isAdded ? "rgba(34,197,94,0.10)" : "transparent",
                      color: isAdded ? "var(--green)" : "var(--ink-mute)",
                      padding: "7px 0",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isAdded ? "default" : "pointer",
                      width: "100%",
                    }}
                  >
                    {isAdded ? <><CheckCircle2 style={{ width: 12, height: 12 }} /> Selected</> : <><PlusCircle style={{ width: 12, height: 12 }} /> Select</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
