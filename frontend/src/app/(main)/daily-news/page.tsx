"use client";

import { useState, useEffect } from "react";
import { Newspaper, Volume2 } from "lucide-react";
import { getTodayNews, getRecentNews } from "@/features/news/api";
import type { DailyNews, VocabWord, NewsQuestion } from "@/features/news/api";

type Level = "A2" | "B1" | "C1";

function parseJSON<T>(val: unknown): T[] {
  if (!val) return [];
  if (typeof val === "string") { try { return JSON.parse(val) as T[]; } catch { return []; } }
  if (Array.isArray(val)) return val as T[];
  return [];
}

function NewsContent({ news, level }: { news: DailyNews; level: Level }) {
  const text = level === "A2" ? news.versionA2 : level === "B1" ? news.versionB1 : news.versionC1;
  const vocab = level === "A2" ? parseJSON<VocabWord>(news.vocabA2) : level === "B1" ? parseJSON<VocabWord>(news.vocabB1) : parseJSON<VocabWord>(news.vocabC1);
  const audioUrl = level === "A2" ? news.audioA2Url : level === "B1" ? news.audioB1Url : news.audioC1Url;
  const allQ = parseJSON<NewsQuestion>(news.questions);
  const questions = allQ.filter((q) => q.level === level);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!text) return <p className="text-[var(--text-secondary)] text-sm py-4">Content not available for this level.</p>;

  const correctCount = submitted ? questions.filter((q, i) => (answers[i] ?? "").trim().toLowerCase() === q.answer.toLowerCase()).length : 0;

  return (
    <div className="space-y-6">
      {/* Audio */}
      {audioUrl && (
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[var(--primary)]" />
          <audio controls src={audioUrl} className="flex-1 h-8" />
        </div>
      )}

      {/* Article text */}
      <p className="leading-relaxed text-[var(--text-primary)]">{text}</p>

      {/* Vocabulary */}
      {vocab.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold text-sm">Key vocabulary</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {vocab.map((v) => (
              <div key={v.word} className="rounded-[var(--radius-md)] bg-[var(--bg-soft)] p-2.5">
                <span className="font-medium text-[var(--primary)]">{v.word}</span>
                <span className="text-xs text-[var(--text-secondary)] ml-2">— {v.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <p className="font-semibold text-sm">Comprehension check</p>
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm">{i + 1}. {q.prompt}</p>
              {submitted ? (
                <p className={`text-sm font-medium ${(answers[i] ?? "").trim().toLowerCase() === q.answer.toLowerCase() ? "text-green-600" : "text-red-500"}`}>
                  {(answers[i] ?? "").trim().toLowerCase() === q.answer.toLowerCase() ? "✓ Correct" : `✗ Answer: ${q.answer}`}
                </p>
              ) : (
                <input
                  type="text"
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}
          {!submitted ? (
            <button onClick={() => setSubmitted(true)} className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Check answers
            </button>
          ) : (
            <p className="text-sm font-medium">Score: {correctCount} / {questions.length}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyNewsPage() {
  const [news, setNews] = useState<DailyNews | null>(null);
  const [recent, setRecent] = useState<DailyNews[]>([]);
  const [level, setLevel] = useState<Level>("B1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTodayNews(), getRecentNews()]).then(([t, r]) => {
      setNews(t);
      setRecent(r);
      setLoading(false);
    });
  }, []);

  const date = news ? new Date(news.newsDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  if (loading) return <div className="page-shell py-16 text-center text-[var(--text-secondary)]">Loading news…</div>;

  if (!news) return (
    <div className="page-shell py-16 text-center space-y-3">
      <Newspaper className="mx-auto h-12 w-12 text-[var(--text-secondary)] opacity-30" />
      <p className="text-[var(--text-secondary)]">No news available yet. Check back at 06:00 UTC.</p>
    </div>
  );

  return (
    <div className="page-shell py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-[var(--primary)]" />
          <div>
            <h1 className="text-2xl font-bold">Daily News</h1>
            <p className="text-sm text-[var(--text-secondary)] capitalize">{date} · {news.topic}</p>
          </div>
        </div>
      </div>

      {/* Headline */}
      {news.originalHeadline && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1">Today&apos;s headline</p>
          <p className="font-semibold text-[var(--text-primary)]">{news.originalHeadline}</p>
          {news.sourceUrl && (
            <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline mt-1 inline-block">
              Original source →
            </a>
          )}
        </div>
      )}

      {/* Level tabs */}
      <div className="flex gap-1">
        {(["A2", "B1", "C1"] as Level[]).map((lv) => (
          <button
            key={lv}
            onClick={() => setLevel(lv)}
            className={`rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors ${
              level === lv ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {lv}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <NewsContent news={news} level={level} />
      </div>

      {/* Archive */}
      {recent.length > 1 && (
        <div className="space-y-3">
          <p className="font-semibold text-sm">This week</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(1).map((r) => (
              <button
                key={r.id}
                onClick={() => setNews(r)}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left hover:shadow-sm transition-shadow"
              >
                <p className="text-xs text-[var(--text-secondary)]">
                  {new Date(r.newsDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <p className="text-sm font-medium capitalize">{r.topic}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
