"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shuffle } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

function JoinForm() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (trimmedCode.length < 4) {
      setError(t("quiz.join.errInvalidCode"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/quizzes/live-sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, displayName: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("quiz.errNetwork"));
        setLoading(false);
        return;
      }
      // Redirect to live game page. Spectators (role="spectator") get a flag
      // so the page disables answer inputs.
      const tid = data.teamMode ? `&tid=${data.teamId}` : "";
      const role = data.role === "spectator" ? "&role=spectator" : "";
      router.push(`/quizzes/live/${trimmedCode}?pid=${data.participantId}${tid}${role}`);
    } catch {
      setError(t("quiz.errNetwork"));
      setLoading(false);
    }
  };

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/quizzes" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("quiz.backToLibrary")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("quiz.live.joinTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("quiz.liveMode")}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("quiz.live.joinSubtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Join code */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("quiz.live.joinCode")}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={8}
              placeholder={t("quiz.live.codePlaceholder")}
              required
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2.5 font-mono text-lg tracking-[0.2em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("quiz.live.namePlaceholder")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={t("quiz.live.namePlaceholder")}
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Anonymous name shortcut */}
          <button
            type="button"
            onClick={() => setName("")}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {t("quiz.live.anonymousName")}
          </button>

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? t("quiz.live.joiningBtn") : t("quiz.live.joinBtn")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
