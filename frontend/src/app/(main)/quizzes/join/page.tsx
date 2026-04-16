"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shuffle } from "lucide-react";
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
      setError("Please enter a valid code");
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
        setError(data.error ?? "Failed to join session");
        setLoading(false);
        return;
      }
      // Redirect to live game page
      router.push(`/quizzes/live/${trimmedCode}?pid=${data.participantId}`);
    } catch {
      setError("Network error, please try again");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("quiz.backToLibrary")}
      </Link>

      <div className="mt-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t("quiz.liveMode")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {t("quiz.live.joinTitle")}
        </h1>
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
            <p className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-400">
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
