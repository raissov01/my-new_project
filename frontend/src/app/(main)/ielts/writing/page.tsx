import Link from "next/link";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSWritingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const tasks = [
    { id: "task1", title: t("ielts.writingTask1"), body: t("ielts.writingTask1Body"), time: "20 min" },
    { id: "task2", title: t("ielts.writingTask2"), body: t("ielts.writingTask2Body"), time: "40 min" },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Link href="/ielts" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        {t("ielts.backToHub")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-[var(--text-primary)]">
            <PenLine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {t("ielts.writingTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ielts.writingSubtitle")}</p>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-500">
          <Sparkles className="h-3.5 w-3.5" />
          {t("ielts.aiPoweredFeedback")}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">{task.title}</h3>
              <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">{task.time}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{task.body}</p>
            <div className="mt-5">
              <Button variant="outline" disabled className="opacity-60">{t("ielts.comingSoon")}</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("ielts.writingHowItWorks")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StepCard step="1" title={t("ielts.writingStep1")} body={t("ielts.writingStep1Body")} />
          <StepCard step="2" title={t("ielts.writingStep2")} body={t("ielts.writingStep2Body")} />
          <StepCard step="3" title={t("ielts.writingStep3")} body={t("ielts.writingStep3Body")} />
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-400">{step}</div>
      <h4 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
