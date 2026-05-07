"use client";

import { Printer } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function PrintButton({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      }
    >
      <Printer className="h-4 w-4" />
      {t("nuet.topic.printButton")}
    </button>
  );
}
