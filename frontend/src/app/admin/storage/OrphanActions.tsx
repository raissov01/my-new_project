"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteOrphan, bulkDeleteOrphans } from "./actions";

export function DeleteOrphanButton({ dir, name }: { dir: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onClick() {
    if (!confirm(`Delete ${name} permanently?`)) return;
    startTransition(async () => {
      const res = await deleteOrphan(dir, name);
      setMsg(res.ok ? "deleted" : (res.error ?? "failed"));
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      title={msg ?? "Delete this orphan file"}
    >
      <Trash2 className="h-3 w-3" />
      {pending ? "..." : msg ?? "delete"}
    </button>
  );
}

export function BulkDeleteOrphans({ dir }: { dir: string }) {
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(30);
  const [msg, setMsg] = useState<string | null>(null);

  function onClick() {
    if (!confirm(`Delete ALL orphan files older than ${days} days in ${dir}?`)) return;
    startTransition(async () => {
      const res = await bulkDeleteOrphans(dir, days);
      if (res.ok) {
        setMsg(`Deleted ${res.deleted ?? 0} files (${fmtBytes(res.bytesFreed ?? 0)})`);
      } else {
        setMsg(res.error ?? "failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
      <label className="flex items-center gap-1 text-[var(--text-secondary)]">
        Older than
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 7)}
          className="w-16 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs tabular-nums"
        />
        days
      </label>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-red-300 bg-red-50 px-2 py-1 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" />
        {pending ? "Deleting..." : `Delete orphans in "${dir}"`}
      </button>
      {msg && <span className="text-[var(--text-secondary)]">{msg}</span>}
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
