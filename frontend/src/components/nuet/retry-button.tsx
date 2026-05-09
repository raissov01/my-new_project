"use client";

import { RotateCw } from "lucide-react";

// Used as a fallback CTA on server components when their backend fetch
// returns an empty list and we suspect a transient failure (vs genuinely
// no data). Next.js's router.refresh() re-triggers the server fetch
// without a hard reload.
export function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
    >
      <RotateCw className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
