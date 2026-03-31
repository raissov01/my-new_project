"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareSetPanelLabels = {
  badge: string;
  title: string;
  subtitle: string;
  copyLink: string;
  copied: string;
  nativeShare: string;
  nativeUnavailable: string;
  whatsapp: string;
  telegram: string;
  openSet: string;
  privateHint: string;
  copyFailed: string;
};

interface ShareSetPanelProps {
  setId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  highlight?: boolean;
  labels: ShareSetPanelLabels;
}

export function ShareSetPanel({
  setId,
  title,
  description,
  isPublic,
  highlight = false,
  labels,
}: ShareSetPanelProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}/sets/${setId}`);
  }, [setId]);

  useEffect(() => {
    if (copyState !== "success") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const shareText = useMemo(() => {
    const parts = [title.trim()];
    if (description?.trim()) {
      parts.push(description.trim());
    }
    return parts.join(" - ");
  }, [description, title]);

  const shareMessage = useMemo(() => {
    if (!shareUrl) return shareText;
    return `${shareText} ${shareUrl}`;
  }, [shareText, shareUrl]);

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleCopy() {
    if (!shareUrl) {
      setCopyState("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("success");
    } catch (error) {
      console.error("Failed to copy set link", error);
      setCopyState("error");
    }
  }

  async function handleNativeShare() {
    if (!shareUrl || !hasNativeShare) return;

    try {
      setIsSharing(true);
      await navigator.share({
        title,
        text: description?.trim() || title,
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to invoke native share", error);
      setCopyState("error");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6",
        highlight &&
          "border-[rgba(99,91,255,0.4)] bg-[linear-gradient(180deg,rgba(99,91,255,0.12),rgba(13,14,22,0.96))] shadow-[0_22px_48px_-34px_rgba(99,91,255,0.72)]"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-400">
            {labels.badge}
          </p>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-2xl">
              {labels.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {labels.subtitle}
            </p>
          </div>
        </div>
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <ExternalLink className="h-4 w-4" />
          {labels.openSet}
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant={copyState === "success" ? "secondary" : "primary"}
          size="md"
          className="w-full sm:w-auto"
          onClick={handleCopy}
        >
          {copyState === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copyState === "success" ? labels.copied : labels.copyLink}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full sm:w-auto"
          disabled={!hasNativeShare || !shareUrl}
          isLoading={isSharing}
          onClick={handleNativeShare}
          title={!hasNativeShare ? labels.nativeUnavailable : undefined}
        >
          <Share2 className="h-4 w-4" />
          {labels.nativeShare}
        </Button>

        <Link
          href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] sm:w-auto"
        >
          <Send className="h-4 w-4" />
          {labels.whatsapp}
        </Link>

        <Link
          href={`https://t.me/share/url?url=${encodeURIComponent(
            shareUrl
          )}&text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] sm:w-auto"
        >
          <Send className="h-4 w-4" />
          {labels.telegram}
        </Link>
      </div>

      {!isPublic ? (
        <p className="mt-4 text-sm leading-6 text-amber-300/90">{labels.privateHint}</p>
      ) : null}

      {copyState === "error" ? (
        <p className="mt-3 text-sm text-red-400">{labels.copyFailed}</p>
      ) : null}

      {!hasNativeShare ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">{labels.nativeUnavailable}</p>
      ) : null}
    </section>
  );
}
