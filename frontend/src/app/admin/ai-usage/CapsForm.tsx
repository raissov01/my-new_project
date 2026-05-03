"use client";

import { useState, useTransition } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { updateAICostCaps } from "./actions";

interface Props {
  initialUserCap: number;
  initialGlobalCap: number;
  updatedAt: string;
}

export function CapsForm({ initialUserCap, initialGlobalCap, updatedAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function onSubmit(form: FormData) {
    startTransition(async () => {
      const res = await updateAICostCaps(form);
      setStatus(
        res.ok
          ? { ok: true, msg: "Saved." }
          : { ok: false, msg: res.error ?? "save failed" },
      );
    });
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Daily caps</h2>
        <span className="ml-auto text-xs text-[var(--text-secondary)]">
          {updatedAt ? `Updated ${updatedAt.slice(0, 16).replace("T", " ")} UTC` : "Not yet set"}
        </span>
      </header>

      <form action={onSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Per-user daily cap (USD)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            name="dailyUserUsdCap"
            defaultValue={initialUserCap.toFixed(2)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm tabular-nums"
          />
          <span className="text-[10px] text-[var(--text-secondary)]">
            0 = unlimited. Rolling 24h window.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Global daily cap (USD)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            name="dailyGlobalUsdCap"
            defaultValue={initialGlobalCap.toFixed(2)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm tabular-nums"
          />
          <span className="text-[10px] text-[var(--text-secondary)]">
            Total spend across all users. 0 = unlimited.
          </span>
        </label>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving..." : "Save caps"}
          </button>
          {status && (
            <span
              className={`text-xs ${status.ok ? "text-green-600" : "text-red-600"}`}
              role="status"
            >
              {status.msg}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
