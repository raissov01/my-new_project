"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Zap,
  Timer,
  Trophy,
  ArrowRight,
  X,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "flashlearn_onboarding_seen";

const STEPS = [
  { icon: Sparkles, titleKey: "onboarding.step1Title", bodyKey: "onboarding.step1Body", color: "from-indigo-600 to-purple-600" },
  { icon: BookOpen, titleKey: "onboarding.step2Title", bodyKey: "onboarding.step2Body", color: "from-emerald-500 to-teal-500" },
  { icon: Zap, titleKey: "onboarding.step3Title", bodyKey: "onboarding.step3Body", color: "from-amber-500 to-orange-500" },
  { icon: Timer, titleKey: "onboarding.step4Title", bodyKey: "onboarding.step4Body", color: "from-red-500 to-rose-500" },
  { icon: Trophy, titleKey: "onboarding.step5Title", bodyKey: "onboarding.step5Body", color: "from-violet-500 to-purple-500" },
] as const;

export function OnboardingModal() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      requestAnimationFrame(() => {
        setOpen(true);
      });
    }
  }, []);

  function dismiss() {
    setOpen(false);
    window.localStorage.setItem(ONBOARDING_KEY, "true");
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-scale-in relative w-full max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-indigo-600"
                  : i < step
                    ? "w-1.5 bg-indigo-300"
                    : "w-1.5 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mt-6 flex justify-center">
          <div
            className={`animate-confetti-pop rounded-2xl bg-gradient-to-br ${current.color} p-4 shadow-lg`}
          >
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <h2 className="mt-6 text-center text-xl font-bold text-[var(--text-primary)]">
          {t(current.titleKey)}
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-[var(--text-secondary)]">
          {t(current.bodyKey)}
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          {isLast ? (
            <>
              <Button onClick={dismiss} className="w-full">
                {t("onboarding.getStarted")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Link
                href="/guide"
                onClick={dismiss}
                className="text-center text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
              >
                {t("onboarding.readGuide")}
              </Link>
            </>
          ) : (
            <div className="flex gap-3">
              <Button variant="ghost" onClick={dismiss} className="flex-1">
                {t("onboarding.skip")}
              </Button>
              <Button onClick={next} className="flex-1">
                {t("onboarding.next")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
