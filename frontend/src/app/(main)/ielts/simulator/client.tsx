"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Headphones, Mic, PenLine, Target } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type MockType = "predictions" | "cambridge_style";
type Section = "full" | "reading" | "listening" | "writing" | "speaking";
type BandTarget = "5.0" | "5.5" | "6.0" | "6.5" | "7.0" | "7.5" | "8.0";

export function SimulatorClient() {
  const { t } = useLocale();
  const [mockType, setMockType] = useState<MockType>("predictions");
  const [section, setSection] = useState<Section>("full");
  const [bandTarget, setBandTarget] = useState<BandTarget>("6.5");

  const mockTypes: { key: MockType; title: string; body: string }[] = [
    { key: "predictions", title: t("ielts.sim.predictions"), body: t("ielts.sim.predictionsBody") },
    { key: "cambridge_style", title: t("ielts.sim.cambridge"), body: t("ielts.sim.cambridgeBody") },
  ];

  const sections: { key: Section; title: string; icon: typeof BookOpen; time: string }[] = [
    { key: "full", title: t("ielts.sim.fullTest"), icon: ClipboardCheck, time: "2h 45min" },
    { key: "listening", title: t("ielts.simListening"), icon: Headphones, time: "30 min" },
    { key: "reading", title: t("ielts.simReading"), icon: BookOpen, time: "60 min" },
    { key: "writing", title: t("ielts.simWriting"), icon: PenLine, time: "60 min" },
    { key: "speaking", title: t("ielts.simSpeaking"), icon: Mic, time: "11-14 min" },
  ];

  const bands: BandTarget[] = ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0"];

  // For writing & speaking sections, redirect to the dedicated practice pages
  function getStartHref() {
    if (section === "writing") return "/ielts/writing";
    if (section === "speaking") return "/ielts/speaking";
    return null; // reading/listening/full will be handled in-page later
  }

  const directHref = getStartHref();

  return (
    <div className="space-y-8">
      {/* Mock type selection */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("ielts.sim.chooseMockType")}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ielts.sim.chooseMockTypeBody")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {mockTypes.map((mt) => (
            <button
              key={mt.key}
              onClick={() => setMockType(mt.key)}
              className={`rounded-2xl border p-5 text-left transition-all ${
                mockType === mt.key
                  ? "border-indigo-500/30 bg-indigo-500/5 shadow-[var(--surface-shadow)]"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-indigo-500/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${mockType === mt.key ? "border-indigo-500 bg-indigo-500" : "border-[var(--border)]"}`}>
                  {mockType === mt.key && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{mt.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{mt.body}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section selection */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("ielts.sim.chooseSection")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  section === s.key
                    ? "border-indigo-500/30 bg-indigo-500/5"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-indigo-500/20"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${section === s.key ? "bg-indigo-500/15 text-indigo-400" : "bg-[var(--bg-soft)] text-[var(--text-muted)]"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.time}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Band target */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("ielts.sim.targetBand")}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ielts.sim.targetBandBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {bands.map((b) => (
            <button
              key={b}
              onClick={() => setBandTarget(b)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                bandTarget === b
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-500/30"
              }`}
            >
              Band {b}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("ielts.sim.readyTitle")}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {mockTypes.find((m) => m.key === mockType)?.title} · {sections.find((s) => s.key === section)?.title} · Band {bandTarget}
            </p>
          </div>
          {directHref ? (
            <Link href={directHref}>
              <Button size="lg">
                <Target className="h-4 w-4" />
                {t("ielts.sim.startExam")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button size="lg" disabled={section === "full" || section === "reading" || section === "listening"}>
              <Target className="h-4 w-4" />
              {section === "full" || section === "reading" || section === "listening"
                ? t("ielts.sim.comingSoonReading")
                : t("ielts.sim.startExam")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
