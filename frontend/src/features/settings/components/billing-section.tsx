"use client";

import { Crown, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingStatus } from "@/features/settings/api";

interface BillingSectionProps {
  billing: BillingStatus | null;
}

export function BillingSection({ billing }: BillingSectionProps) {
  const isPro = billing?.isPro ?? false;

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-5 w-5 text-yellow-500" />
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Жазылым / Subscription
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Ағымдағы жоспар: <span className="font-medium text-[var(--text-primary)]">{isPro ? "Pro" : "Free"}</span>
          </p>
        </div>
        {isPro && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Crown className="h-3.5 w-3.5" /> Pro
          </span>
        )}
      </div>

      {isPro ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            Барлық Pro мүмкіндіктер белсенді
          </div>
          {billing?.currentPeriodEnd && (
            <p className="text-xs text-[var(--text-muted)]">
              Келесі төлем: {new Date(billing.currentPeriodEnd).toLocaleDateString("ru-RU")}
            </p>
          )}
          {billing?.subStatus === "cancelled" && (
            <p className="text-xs text-orange-500">
              Жазылым жойылды — мерзім біткенше Pro пайдалануға болады
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            {[
              "Шексіз сабақтар (English Simulator)",
              "Толық IELTS тренажеры",
              "AI Tutor — шексіз хабарламалар",
              "AI Quiz генерация",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
                {feature}
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
              Pro-ға жазылу — $9/ай
            </a>
          )}
        </div>
      )}
    </div>
  );
}
