"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function DashboardSearch() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  function navigate(value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/dashboard?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/dashboard");
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(query);
  }

  function handleClear() {
    setQuery("");
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
      <input
        type="text"
        placeholder={t("dashboard.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("dashboard.searchAria")}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 pl-10 pr-9 text-sm text-[var(--text-primary)] shadow-sm transition-all placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t("dashboard.clearSearch")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
