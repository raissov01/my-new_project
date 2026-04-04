"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getWritingHistory, type WritingHistoryItem } from "../../writing/actions";

export function IELTSWritingHistoryClient() {
  const [items, setItems] = useState<WritingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const history = await getWritingHistory();
      if (mounted) {
        setItems(history);
        setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm text-[var(--text-secondary)]">No writing history yet.</div>
      ) : null}
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{item.taskType}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">Band {item.overallBand.toFixed(1)}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.prompt}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Word count: {item.wordCount}</p>
        </div>
      ))}
    </div>
  );
}
