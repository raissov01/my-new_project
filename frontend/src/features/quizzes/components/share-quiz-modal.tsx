"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Files, X, ExternalLink } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";

interface ShareQuizModalProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onClose: () => void;
}

export function ShareQuizModal({
  quizId,
  quizTitle,
  open,
  onClose,
}: ShareQuizModalProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/quizzes/${encodeURIComponent(quizId)}`;
  }, [quizId]);

  const handleCopy = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast("success", t("quiz.share.linkCopied"));
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("error", t("quiz.share.copyFailed"));
    }
  }, [publicUrl, toast, t]);

  const handleDuplicate = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/quizzes/${encodeURIComponent(quizId)}/clone`,
          { method: "POST" }
        );
        const data = (await res.json().catch(() => null)) as
          | { id?: string; error?: string }
          | null;
        if (!res.ok || !data?.id) {
          toast("error", data?.error ?? t("quiz.share.duplicateFailed"));
          return;
        }
        toast("success", t("quiz.share.duplicated"));
        onClose();
        router.push(`/quizzes/${encodeURIComponent(data.id)}/edit`);
      } catch {
        toast("error", t("quiz.share.duplicateFailed"));
      }
    });
  }, [quizId, router, toast, t, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{
        background: visible ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "blur(0px)",
        transition: "background 0.25s, backdrop-filter 0.25s",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl"
        style={{
          maxWidth: 560,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(16px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), opacity 0.2s",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{
            background: "linear-gradient(135deg, var(--primary)/12% 0%, transparent 60%)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--primary)] mb-1">
            {t("quiz.share.title")}
          </p>
          <h2
            className="text-xl font-bold text-[var(--text-primary)] leading-snug pr-8"
            style={{ wordBreak: "break-word" }}
          >
            {quizTitle}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          {/* QR code */}
          <div className="flex flex-col items-center gap-3 sm:shrink-0">
            <div
              className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-4"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
            >
              {publicUrl ? (
                <QRCodeSVG value={publicUrl} size={172} includeMargin={false} />
              ) : (
                <div className="h-[172px] w-[172px] animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-soft)]" />
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] text-center">
              {t("quiz.share.qrHint") || "Сканерлеп ашыңыз"}
            </p>
          </div>

          {/* Right side */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {/* Link */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">
                {t("quiz.share.linkLabel")}
              </label>
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5">
                <input
                  readOnly
                  value={publicUrl}
                  className="min-w-0 flex-1 truncate bg-transparent text-sm text-[var(--text-primary)] outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-[var(--radius-lg)] py-2.5 px-4 text-sm font-semibold transition-all"
                style={{
                  background: copied ? "var(--success)" : "var(--primary)",
                  color: "#fff",
                  boxShadow: copied
                    ? "0 2px 12px rgba(34,197,94,0.3)"
                    : "0 2px 12px rgba(var(--primary-rgb, 99,102,241),0.3)",
                }}
              >
                {copied ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
                {copied ? t("quiz.share.copied") : t("quiz.share.copy")}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[11px] text-[var(--text-muted)]">немесе</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)] transition-colors"
              >
                <ExternalLink size={14} />
                {t("quiz.share.openLink") || "Жаңа қойындыда ашу"}
              </a>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={pending}
                className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)] transition-colors disabled:opacity-50"
              >
                {pending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--primary)]" />
                ) : (
                  <Files size={14} />
                )}
                {t("quiz.share.duplicate")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
