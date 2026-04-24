"use client";

import { useState, useEffect } from "react";
import { GraduationCap, CalendarDays, Target, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ielts_onboarding_done";
const BAND_OPTIONS = ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5+"];

function formatDateLabel(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("kk-KZ", { year: "numeric", month: "long", day: "numeric" });
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function IELTSOnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"band" | "date" | "done">("band");
  const [targetBand, setTargetBand] = useState("7.0");
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Only show if user hasn't completed onboarding yet
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleComplete() {
    setSaving(true);
    const data = { targetBand, examDate, completedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaving(false);
    setStep("done");
    setTimeout(() => setOpen(false), 1400);
  }

  function handleSkip() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ skipped: true }));
    setOpen(false);
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <Modal isOpen={open} onClose={handleSkip}>
      {step === "done" ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Target className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">Жоспарыңыз дайын!</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Мақсат: Band {targetBand}
              {examDate && ` · ${daysUntil(examDate)} күн қалды`}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <GraduationCap className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                IELTS жоспарыңызды жасайық
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                2 сұрақ — 30 секунд
              </p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="mb-5 flex gap-2">
            {(["band", "date"] as const).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step === s || (s === "band" && step === "date")
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          {step === "band" && (
            <div>
              <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Мақсатты Band баллыңыз қандай?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BAND_OPTIONS.map((band) => (
                  <button
                    key={band}
                    onClick={() => setTargetBand(band)}
                    className={`
                      rounded-[var(--radius-lg)] border py-2.5 text-sm font-bold transition-all
                      ${targetBand === band
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50"
                      }
                    `}
                  >
                    {band}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  Өткізіп жіберу
                </button>
                <Button onClick={() => setStep("date")}>
                  Келесі
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "date" && (
            <div>
              <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Емтихан күніңіз қашан?
              </p>
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="date"
                  min={minDateStr}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                />
              </div>
              {examDate && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {formatDateLabel(examDate)} — {daysUntil(examDate)} күн қалды
                </p>
              )}

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setStep("band")}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  ← Артқа
                </button>
                <Button onClick={handleComplete} disabled={saving}>
                  {saving ? "Сақталуда..." : "Жоспар жасау"}
                  <Target className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
