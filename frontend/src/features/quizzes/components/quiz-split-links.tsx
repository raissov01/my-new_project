"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Files, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type QuizSplitLinksProps = {
  quizId: string;
  questionCount: number;
  isPublic: boolean;
};

type QuizPartLink = {
  label: string;
  range: string;
  href: string;
};

function clampChunkSize(value: number, total: number): number {
  if (!Number.isFinite(value)) return Math.min(50, Math.max(1, total));
  return Math.min(Math.max(1, Math.round(value)), Math.max(1, total));
}

export function QuizSplitLinks({
  quizId,
  questionCount,
  isPublic,
}: QuizSplitLinksProps) {
  const { toast } = useToast();
  const [chunkSizeText, setChunkSizeText] = useState("50");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const chunkSize = clampChunkSize(Number.parseInt(chunkSizeText, 10), questionCount);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const links = useMemo<QuizPartLink[]>(() => {
    if (!origin || questionCount <= 0) return [];
    const parts = Math.ceil(questionCount / chunkSize);
    return Array.from({ length: parts }, (_, index) => {
      const from = index * chunkSize + 1;
      const to = Math.min(questionCount, from + chunkSize - 1);
      const params = new URLSearchParams({
        from: String(from),
        limit: String(chunkSize),
        part: String(index + 1),
      });
      return {
        label: `Part ${index + 1}`,
        range: `${from}-${to}`,
        href: `${origin}/quizzes/${encodeURIComponent(quizId)}/play?${params.toString()}`,
      };
    });
  }, [chunkSize, origin, questionCount, quizId]);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast("success", "Ссылка көшірілді");
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      toast("error", "Көшіру мүмкін болмады");
    }
  }

  const allLinksText = links
    .map((link) => `${link.label} (${link.range}): ${link.href}`)
    .join("\n");

  if (questionCount <= 1) return null;

  return (
    <section className="nd-mock-shell nd-reveal nd-d4" style={{ marginBottom: 32, padding: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0, maxWidth: 560 }}>
          <p className="nd-eyebrow" style={{ marginBottom: 8 }}>
            Split quiz
          </p>
          <h2 style={{ margin: 0, color: "var(--ink)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>
            Quiz-ді бөліп тапсыру
          </h2>
          <p style={{ marginTop: 8, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
            Бір quiz-ден бірнеше жеке play link жасайды. Мысалы, 200 сұрақты 50-ден бөлсеңіз, 4 бөлек ссылка шығады.
          </p>
          {!isPublic ? (
            <p style={{ marginTop: 8, color: "#b45309", fontSize: 13, lineHeight: 1.5 }}>
              Private quiz болса, басқа адам алдымен invite link арқылы access алуы керек.
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 150 }}>
            <Input
              id="quiz-split-size"
              type="number"
              min={1}
              max={questionCount}
              label="Сұрақ саны"
              value={chunkSizeText}
              onChange={(event) => setChunkSizeText(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => copyText(allLinksText, "all")}
            disabled={links.length === 0}
          >
            {copiedKey === "all" ? <Check className="h-4 w-4" /> : <Files className="h-4 w-4" />}
            Copy all
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
        {links.map((link) => (
          <div
            key={link.href}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 12,
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              background: "var(--bg-surface)",
              padding: "12px 14px",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                width: 34,
                height: 34,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <Scissors className="h-4 w-4" />
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                {link.label} · Q{link.range}
              </p>
              <input
                readOnly
                value={link.href}
                onFocus={(event) => event.currentTarget.select()}
                style={{
                  marginTop: 4,
                  width: "100%",
                  minWidth: 0,
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  color: "var(--ink-soft)",
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyText(link.href, link.href)}
              aria-label={`${link.label} link copy`}
            >
              {copiedKey === link.href ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
