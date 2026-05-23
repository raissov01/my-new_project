"use client";

import { Crown, CheckCircle2, Zap, Gift } from "lucide-react";
import type { BillingStatus } from "@/features/settings/api";
import { useLocale } from "@/components/providers/locale-provider";

interface BillingSectionProps {
  billing: BillingStatus | null;
}

export function BillingSection({ billing }: BillingSectionProps) {
  const { t } = useLocale();
  // isPro = effective tier (paid OR trial), used for "Pro features" surfaces.
  // isPaid = the user has an actual paid subscription — gates subscription
  // details and hides the upgrade pitch. Trial users see the pitch so they
  // can subscribe before their trial expires.
  const isPro = billing?.isPro ?? false;
  const isPaid = billing?.plan === "pro";
  const inTrial = billing?.inTrial ?? false;
  const features = billing?.features ?? {};
  const trialEndsAt = billing?.trialEndsAt ? new Date(billing.trialEndsAt) : null;

  // Free-tier daily caps to display. We hide ungated entries (limit === 0).
  const gatedEntries = Object.entries(features)
    .filter(([, q]) => q.limit > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-5 w-5 text-yellow-500" />
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {t("billing.title")}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {t("billing.plan")}{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {isPro ? (inTrial ? t("billing.tierProTrial") : "Pro") : "Free"}
            </span>
          </p>
        </div>
        {isPro && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Crown className="h-3.5 w-3.5" /> Pro
          </span>
        )}
      </div>

      {inTrial && trialEndsAt && (
        <div className="mb-5 flex items-start gap-2 rounded-[var(--radius-md)] border border-green-500/30 bg-green-500/10 p-3 text-sm">
          <Gift className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          <div className="text-[var(--text-secondary)]">
            {t("billing.trialActive", { date: trialEndsAt.toLocaleDateString() })}
          </div>
        </div>
      )}

      {!isPro && gatedEntries.length > 0 && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface-2)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {t("billing.dailyLimits")}
          </p>
          <ul className="space-y-1.5 text-sm">
            {gatedEntries.map(([key, q]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  {t(`feature.${key}`)}
                </span>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {q.used}/{q.limit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isPaid ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            {t("billing.proFeatures")}
          </div>
          {billing?.currentPeriodEnd && (
            <p className="text-xs text-[var(--text-muted)]">
              {t("billing.nextPayment")} {new Date(billing.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          {billing?.subStatus === "cancelled" && (
            <p className="text-xs text-orange-500">
              {t("billing.cancelled")}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            {([
              "billing.upgradeFeat1",
              "billing.upgradeFeat2",
              "billing.upgradeFeat3",
              "billing.upgradeFeat4",
            ] as const).map((key) => (
              <div key={key} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
                {t(key)}
              </div>
            ))}
          </div>
          {billing?.checkoutURL && (
            <a
              href={billing.checkoutURL}
              className="lemonsqueezy-button inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-yellow-500 hover:bg-yellow-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              rel="noopener noreferrer"
            >
              <Crown className="h-4 w-4" />
              {t("billing.subscribe")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
