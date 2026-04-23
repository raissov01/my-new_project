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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  try {
    const res = await fetch(`${apiUrl}/mining/extract`, {
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

const TOPIC_COLORS: Record<string, string> = {
  business: "bg-amber-50 text-amber-700",
  technology: "bg-blue-50 text-blue-700",
  environment: "bg-green-50 text-green-700",
  health: "bg-red-50 text-red-700",
  communication: "bg-purple-50 text-purple-700",
  general: "bg-gray-50 text-gray-600",
};

async function saveWordsToSet(selectedWords: ExtractedWord[], level: string): Promise<string | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  try {
    const res = await fetch(`${apiUrl}/sets`, {
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
    <div className="page-shell py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Pickaxe className="h-8 w-8 text-[var(--primary)]" />
        <div>
          <h1 className="text-2xl font-bold">Sentence Mining</h1>
          <p className="text-sm text-[var(--text-secondary)]">Paste any English text — AI extracts vocabulary for your level</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Your level:</p>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                level === lv ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste any English article, email, or text here (up to 5,000 characters)…"
          rows={8}
          maxLength={5000}
          className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm outline-none focus:border-[var(--primary)] resize-y"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[var(--text-secondary)]">{text.length} / 5,000 characters</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleExtract}
            disabled={isPending || text.trim().length < 20}
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pickaxe className="h-4 w-4" />}
            Extract vocabulary
          </button>
        </div>
      </div>

      {/* Results */}
      {words.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-semibold">
              Found {words.length} words
              {added.size > 0 && <span className="ml-2 text-[var(--primary)]">· {added.size} selected</span>}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {words.some((w) => !added.has(w.word)) && (
                <button
                  onClick={addAll}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Select all
                </button>
              )}
              <button
                onClick={handleSaveToFlashcards}
                disabled={saving || savedSetId !== null}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {savedSetId ? "Saved!" : `Save ${added.size > 0 ? added.size : words.length} to flashcards`}
              </button>
            </div>
          </div>

          {savedSetId && (
            <a
              href={`/sets/${savedSetId}`}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-green-50 border border-green-300 px-4 py-2.5 text-sm text-green-700 hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Flashcard set created — click to study
              <ExternalLink className="h-3.5 w-3.5 ml-auto" />
            </a>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {words.map((w) => {
              const isAdded = added.has(w.word);
              const topicCls = TOPIC_COLORS[w.topic?.toLowerCase()] ?? TOPIC_COLORS.general;
              return (
                <div key={w.word} className={`rounded-[var(--radius-lg)] border p-4 space-y-2 transition-colors ${isAdded ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] bg-[var(--bg-surface)]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-[var(--primary)]">{w.word}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${topicCls}`}>{w.topic}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{w.definition}</p>
                  <p className="text-xs italic text-[var(--text-secondary)]">&ldquo;{w.example}&rdquo;</p>
                  <button
                    onClick={() => toggleWord(w)}
                    disabled={isAdded}
                    className={`flex w-full items-center justify-center gap-1 rounded-[var(--radius-md)] py-1.5 text-xs font-medium transition-colors ${
                      isAdded
                        ? "bg-green-100 text-green-700 cursor-default"
                        : "border border-[var(--border)] hover:bg-[var(--bg-soft)]"
                    }`}
                  >
                    {isAdded ? <><CheckCircle2 className="h-3 w-3" /> Selected</> : <><PlusCircle className="h-3 w-3" /> Select</>}
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
