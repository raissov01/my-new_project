"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Files, X, ExternalLink, Link2, RefreshCw, Trash2, Lock } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";

interface ShareQuizModalProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onClose: () => void;
}

type InviteState =
  | { status: "idle" }
  | { status: "loaded"; token: string; maxUses: number | null; useCount: number }
  | { status: "loading" }
  | { status: "error" };

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
  const [inviteCopied, setInviteCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [invite, setInvite] = useState<InviteState>({ status: "idle" });
  const [maxUsesInput, setMaxUsesInput] = useState("");
  const maxUsesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Load existing invite links when modal opens
  useEffect(() => {
    if (!open) return;
    setInvite({ status: "idle" });
    fetch(`/api/quizzes/${encodeURIComponent(quizId)}/invite-links`)
      .then((r) => r.json())
      .then((data: { items?: { id: string; maxUses: number | null; useCount: number; isActive: boolean }[] }) => {
        const active = data.items?.find((l) => l.isActive);
        if (active) {
          setInvite({ status: "loaded", token: active.id, maxUses: active.maxUses, useCount: active.useCount });
        } else {
          setInvite({ status: "idle" });
        }
      })
      .catch(() => setInvite({ status: "idle" }));
  }, [open, quizId]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/quizzes/${encodeURIComponent(quizId)}`;
  }, [quizId]);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined" || invite.status !== "loaded") return "";
    return `${window.location.origin}/quizzes/join/${encodeURIComponent(invite.token)}`;
  }, [invite]);

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

  const handleCopyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      toast("success", t("quiz.share.inviteLinkCopied"));
      window.setTimeout(() => setInviteCopied(false), 2500);
    } catch {
      toast("error", t("quiz.share.copyFailed"));
    }
  }, [inviteUrl, toast, t]);

  const handleGenerateInvite = useCallback(async () => {
    setInvite({ status: "loading" });
    const maxUses = maxUsesInput.trim() !== "" ? parseInt(maxUsesInput, 10) : null;
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/invite-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUses }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error ?? "");
      setInvite({ status: "loaded", token: data.token, maxUses: maxUses ?? null, useCount: 0 });
      toast("success", t("quiz.share.inviteLinkGenerated"));
    } catch {
      setInvite({ status: "error" });
      toast("error", t("quiz.share.inviteLinkError"));
    }
  }, [quizId, maxUsesInput, toast, t]);

  const handleRefreshInvite = useCallback(async () => {
    // Revoke old then create new
    if (invite.status === "loaded") {
      await fetch(`/api/quiz-invite/${encodeURIComponent(invite.token)}`, { method: "DELETE" }).catch(() => null);
    }
    setInvite({ status: "loading" });
    const maxUses = maxUsesInput.trim() !== "" ? parseInt(maxUsesInput, 10) : (invite.status === "loaded" ? invite.maxUses : null);
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/invite-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUses }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error ?? "");
      setInvite({ status: "loaded", token: data.token, maxUses: maxUses ?? null, useCount: 0 });
      toast("success", t("quiz.share.inviteLinkGenerated"));
    } catch {
      setInvite({ status: "error" });
      toast("error", t("quiz.share.inviteLinkError"));
    }
  }, [invite, quizId, maxUsesInput, toast, t]);

  const handleRevokeInvite = useCallback(async () => {
    if (invite.status !== "loaded") return;
    const token = invite.token;
    setInvite({ status: "loading" });
    try {
      await fetch(`/api/quiz-invite/${encodeURIComponent(token)}`, { method: "DELETE" });
      setInvite({ status: "idle" });
      toast("success", t("quiz.share.inviteLinkRevoked"));
    } catch {
      toast("error", t("quiz.share.inviteLinkError"));
    }
  }, [invite, toast, t]);

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

  const spotsLeft = useMemo(() => {
    if (invite.status !== "loaded" || invite.maxUses === null) return null;
    return Math.max(0, invite.maxUses - invite.useCount);
  }, [invite]);

  if (!open) return null;

  const isGenerating = invite.status === "loading";
  const hasLink = invite.status === "loaded";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div className="flex min-h-full w-full items-center justify-center p-4 py-8">
        <div
          className="relative w-full overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl"
          style={{ maxWidth: 600 }}
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
                {t("quiz.share.qrHint")}
              </p>
            </div>

            {/* Right side */}
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              {/* Public link */}
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
                  {copied ? <Check size={15} /> : <Copy size={15} />}
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
                  {t("quiz.share.openLink")}
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

          {/* Invite link section */}
          <div
            className="mx-6 mb-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)]"
            style={{ overflow: "hidden" }}
          >
            {/* Section header */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}
            >
              <Lock size={13} className="text-[var(--primary)] shrink-0" />
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {t("quiz.share.inviteSection")}
              </span>
              <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                {t("quiz.share.inviteHint")}
              </span>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Max uses row */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] shrink-0">
                  {t("quiz.share.maxUses")}
                </label>
                <input
                  ref={maxUsesRef}
                  type="number"
                  min={1}
                  max={9999}
                  value={maxUsesInput}
                  onChange={(e) => setMaxUsesInput(e.target.value)}
                  placeholder={t("quiz.share.maxUsesPlaceholder")}
                  className="w-28 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors"
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  {maxUsesInput.trim() === "" ? t("quiz.share.unlimited") : ""}
                </span>
              </div>

              {/* Active invite link display */}
              {hasLink && (
                <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                  <Link2 size={13} className="shrink-0 text-[var(--primary)]" />
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)] font-mono">
                    {inviteUrl}
                  </span>
                  {spotsLeft !== null && (
                    <span className="shrink-0 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                      {t("quiz.share.usesLeft").replace("{n}", String(spotsLeft))}
                    </span>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2">
                {!hasLink ? (
                  <button
                    type="button"
                    onClick={handleGenerateInvite}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: "var(--primary)" }}
                  >
                    {isGenerating ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Link2 size={13} />
                    )}
                    {t("quiz.share.generateLink")}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyInvite}
                      className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold text-white transition-all"
                      style={{ background: inviteCopied ? "var(--success)" : "var(--primary)" }}
                    >
                      {inviteCopied ? <Check size={13} /> : <Copy size={13} />}
                      {inviteCopied ? t("quiz.share.copied") : t("quiz.share.copy")}
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshInvite}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)] transition-colors disabled:opacity-50"
                      title={t("quiz.share.refreshLink")}
                    >
                      {isGenerating ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--primary)]" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      {t("quiz.share.refreshLink")}
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeInvite}
                      disabled={isGenerating}
                      className="ml-auto flex items-center gap-1.5 rounded-[var(--radius-md)] border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                    >
                      <Trash2 size={13} />
                      {t("quiz.share.revokeLink")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
