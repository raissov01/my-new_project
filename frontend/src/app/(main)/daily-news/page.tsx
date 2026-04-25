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

  if (!text) return <p style={{ color: "var(--ink-mute)", fontSize: 14, padding: "16px 0" }}>Бұл деңгей үшін мазмұн жоқ.</p>;

  const correctCount = submitted
    ? questions.filter((q, i) => (answers[i] ?? "").trim().toLowerCase() === q.answer.toLowerCase()).length
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {audioUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--paper-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
          <Volume2 style={{ width: 16, height: 16, color: "var(--terra)", flexShrink: 0 }} />
          <audio controls src={audioUrl} style={{ flex: 1, height: 32 }} />
        </div>
      )}

      <p style={{ lineHeight: 1.75, color: "var(--ink)", fontSize: 15 }}>{text}</p>

      {vocab.length > 0 && (
        <div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 10 }}>
            KEY VOCABULARY
          </p>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {vocab.map((v) => (
              <div key={v.word} style={{ borderRadius: 10, background: "var(--paper-2)", padding: "8px 12px", border: "1px solid var(--line)" }}>
                <span style={{ fontWeight: 700, color: "var(--terra)" }}>{v.word}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-mute)", marginLeft: 8 }}>— {v.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 12 }}>
            COMPREHENSION CHECK
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {questions.map((q, i) => (
              <div key={i}>
                <p style={{ fontSize: 14, marginBottom: 6, color: "var(--ink)" }}>{i + 1}. {q.prompt}</p>
                {submitted ? (
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: (answers[i] ?? "").trim().toLowerCase() === q.answer.toLowerCase() ? "var(--green)" : "var(--terra)" }}>
                    {(answers[i] ?? "").trim().toLowerCase() === q.answer.toLowerCase() ? "✓ Дұрыс" : `✗ Жауап: ${q.answer}`}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                    style={{ width: "100%", borderRadius: 10, border: "1.5px solid var(--line)", padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "var(--paper)" }}
                    placeholder="Жауап енгізіңіз…"
                  />
                )}
              </div>
            ))}
          </div>
          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              style={{ marginTop: 14, padding: "9px 20px", borderRadius: 10, background: "var(--ink)", color: "#fff", fontSize: 13.5, fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              Тексеру
            </button>
          ) : (
            <p style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              Нәтиже: {correctCount} / {questions.length}
            </p>
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

  const date = news
    ? new Date(news.newsDate).toLocaleDateString("kk-KZ", { weekday: "long", month: "long", day: "numeric" })
    : "";

  if (loading) {
    return (
      <div className="page-shell py-16" style={{ textAlign: "center", color: "var(--ink-mute)" }}>
        Жүктелуде…
      </div>
    );
  }

  if (!news) {
    return (
      <div className="page-shell py-16" style={{ textAlign: "center" }}>
        <Newspaper style={{ width: 48, height: 48, margin: "0 auto 12px", opacity: .25, color: "var(--ink-mute)" }} />
        <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Бүгін жаңалық жоқ. 06:00 UTC-де қайта тексеріңіз.</p>
      </div>
    );
  }

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header bar */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Newspaper style={{ width: 18, height: 18, color: "var(--terra)" }} />
          <h3>Daily News</h3>
          <span style={{ fontSize: 12, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace", textTransform: "capitalize" }}>
            {date} · {news.topic}
          </span>
        </div>
      </div>

      {/* Headline card */}
      {news.originalHeadline && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 6 }}>
            TODAY&apos;S HEADLINE
          </p>
          <p style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)", lineHeight: 1.4 }}>{news.originalHeadline}</p>
          {news.sourceUrl && (
            <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--terra)", marginTop: 6, display: "inline-block" }}>
              Бастапқы дереккөз →
            </a>
          )}
        </div>
      )}

      {/* Level pills */}
      <div className="nd-lib-filters" style={{ marginBottom: 20 }}>
        {(["A2", "B1", "C1"] as Level[]).map((lv) => (
          <button key={lv} onClick={() => setLevel(lv)}
            className={`nd-lib-pill${level === lv ? " on" : ""}`}>
            {lv}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "24px" }}>
        <NewsContent news={news} level={level} />
      </div>

      {/* Archive */}
      {recent.length > 1 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 12 }}>
            ОСЫ АПТАДА
          </p>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))" }}>
            {recent.slice(1).map((r) => (
              <button key={r.id} onClick={() => setNews(r)}
                style={{ borderRadius: 14, border: "1.5px solid var(--line)", background: "var(--paper)", padding: "12px 14px", textAlign: "left", cursor: "pointer", transition: "border-color .12s" }}>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--ink-mute)", marginBottom: 4 }}>
                  {new Date(r.newsDate).toLocaleDateString("kk-KZ", { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>{r.topic}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
