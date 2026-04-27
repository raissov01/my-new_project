"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Copy as DuplicateIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";

interface ShareQuizModalProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onClose: () => void;
}

// ShareQuizModal centralises the three share actions: copy the public link,
// show a scannable QR for projector/classroom use, and clone the quiz into
// the current user's library. The duplicate action routes to the new edit
// page so the user can rename/edit right away.
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

  // Build a canonical, absolute URL the user can paste anywhere. We prefer
  // the runtime origin so the link reflects whichever domain the page is
  // served from (dev/staging/prod) rather than a hard-coded env var.
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
      // Reset the "copied" check mark after a short delay so the user
      // understands a second click will copy again.
      window.setTimeout(() => setCopied(false), 2000);
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
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("quiz.share.title")}
            </h2>
            <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">
              {quizTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
            aria-label={t("quiz.play.exitConfirmCancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4">
          {publicUrl ? (
            <QRCodeSVG value={publicUrl} size={148} includeMargin={false} />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-soft)]" />
          )}
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t("quiz.share.linkLabel")}
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
            <input
              readOnly
              value={publicUrl}
              className="min-w-0 flex-1 truncate bg-transparent text-sm text-[var(--text-primary)] outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-strong)]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? t("quiz.share.copied") : t("quiz.share.copy")}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleDuplicate}
            isLoading={pending}
          >
            <DuplicateIcon className="h-4 w-4" />
            {t("quiz.share.duplicate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
