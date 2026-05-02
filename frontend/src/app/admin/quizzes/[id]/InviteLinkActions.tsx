"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

export function InviteLinkActions({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const url = `${typeof window === "undefined" ? "" : window.location.origin}/quizzes/join/${encodeURIComponent(token)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail in unsecured contexts; fall back silently.
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={handleCopy}
        title="Copy share URL"
        aria-label="Copy share URL"
        className={
          "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] transition-colors " +
          (copied
            ? "bg-emerald-50 text-emerald-700"
            : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]")
        }
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open share URL in a new tab"
        aria-label="Open share URL"
        className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
