"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { runJobNow } from "./actions";

export function RunNowButton({ name }: { name: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onClick() {
    startTransition(async () => {
      const res = await runJobNow(name);
      setMsg(res.ok ? { ok: true, text: "Triggered" } : { ok: false, text: res.error ?? "failed" });
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-[var(--bg-soft)] disabled:opacity-50"
      >
        <Play className="h-3 w-3" />
        {pending ? "..." : "Run now"}
      </button>
      {msg && (
        <span className={`text-[10px] ${msg.ok ? "text-green-600" : "text-red-600"}`} role="status">
          {msg.text}
        </span>
      )}
    </div>
  );
}
