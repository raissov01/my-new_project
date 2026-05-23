"use client";

import Link from "next/link";
import { Crown, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";
import type { PaywallInfo } from "@/lib/billing/paywall";

interface PaywallModalProps {
  paywall: PaywallInfo | null;
  onClose: () => void;
}

export function PaywallModal({ paywall, onClose }: PaywallModalProps) {
  const { t } = useLocale();
  const open = paywall != null;
  const feature = paywall?.feature ?? "";
  // feature.* keys fall back to the raw key (so a future backend feature
  // missing from i18n shows its slug instead of an empty string).
  const label = t(`feature.${feature}`);
  const limit = paywall?.limit ?? 0;

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="relative">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-0 top-0 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-2)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
            <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {t("paywall.title")}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {limit > 0
                ? t("paywall.subtitle", { label, limit })
                : label}
            </p>
          </div>
        </div>

        <p className="mb-5 text-sm text-[var(--text-secondary)]">
          {t("paywall.body")}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
          >
            {t("paywall.notNow")}
          </button>
          <Link
            href="/upgrade"
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
          >
            <Crown className="h-4 w-4" />
            {t("paywall.upgrade")}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
