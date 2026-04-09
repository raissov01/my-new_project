"use client";

import Link from "next/link";
import { Ghost, X } from "lucide-react";
import { useGhostMode } from "@/features/auth/hooks/use-ghost-mode";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocale } from "@/components/providers/locale-provider";

export function GhostModeBanner() {
  const { user } = useAuth();
  const { isGhost, disableGhostMode } = useGhostMode();
  const { t } = useLocale();

  // Only show when user is not logged in and ghost mode is active
  if (user || !isGhost) return null;

  return (
    <div className="relative z-30 flex items-center justify-between gap-3 bg-[var(--primary)] px-4 py-2 text-white">
      <div className="flex items-center gap-2 text-sm">
        <Ghost className="h-4 w-4 shrink-0" />
        <span>{t("ghost.bannerText")}</span>
        <Link
          href="/signup"
          className="ml-1 font-semibold underline underline-offset-2 hover:no-underline"
          onClick={disableGhostMode}
        >
          {t("ghost.bannerCta")}
        </Link>
      </div>
      <button
        onClick={disableGhostMode}
        aria-label={t("ghost.exitGhostMode")}
        className="shrink-0 rounded p-1 hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
