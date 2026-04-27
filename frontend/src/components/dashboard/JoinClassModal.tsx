"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";

export function JoinClassModal() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function openModal() {
    setCode("");
    setError(null);
    setSuccess(false);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeModal() {
    if (pending) return;
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/student/join-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          router.refresh();
        }, 1500);
      } else {
        setError(data?.error ?? t("joinClass.errorDefault"));
      }
    } catch {
      setError(t("joinClass.errorNetwork"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openModal}>
        <Users className="h-3.5 w-3.5" />
        {t("joinClass.title")}
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

          {/* Modal panel */}
          <div
            className="relative z-10 w-full max-w-sm rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-class-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
                <Users className="h-5 w-5" />
              </div>
              <button
                onClick={closeModal}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
                aria-label={t("joinClass.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 id="join-class-title" className="mt-4 text-lg font-bold tracking-[-0.03em] text-[var(--text-primary)]">
              {t("joinClass.title")}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
              {t("joinClass.desc")}
            </p>

            {success ? (
              <div className="mt-5 flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {t("joinClass.success")}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="join-code" className="block text-sm font-medium text-[var(--text-primary)]">
                    {t("joinClass.codeLabel")}
                  </label>
                  <input
                    ref={inputRef}
                    id="join-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABCD12"
                    maxLength={8}
                    disabled={pending}
                    className="mt-1.5 block w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.2em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:font-normal focus:border-[var(--border-focus)] focus:outline-none disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!code.trim() || pending} isLoading={pending}>
                  {t("joinClass.submit")}
                </Button>

                <p className="text-center text-xs text-[var(--text-muted)]">
                  {t("joinClass.codeHint")}{" "}
                  <span className="text-[var(--text-secondary)]">
                    {t("joinClass.codeHintBody")}
                  </span>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
