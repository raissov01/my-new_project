import Link from "next/link";
import {
  BookOpenText,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  Mic,
  PenLine,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";

export default async function IELTSHubPage() {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const modules = [
    {
      href: "/ielts/simulator",
      icon: ClipboardCheck,
      title: t("ielts.simulatorTitle"),
      body: t("ielts.simulatorBody"),
      tone: "from-indigo-500/20 to-blue-500/10",
      badge: t("ielts.comingSoon"),
    },
    {
      href: "/ielts/writing",
      icon: PenLine,
      title: t("ielts.writingTitle"),
      body: t("ielts.writingBody"),
      tone: "from-emerald-500/18 to-teal-500/10",
      badge: t("ielts.comingSoon"),
    },
    {
      href: "/ielts/speaking",
      icon: Mic,
      title: t("ielts.speakingTitle"),
      body: t("ielts.speakingBody"),
      tone: "from-violet-500/18 to-fuchsia-500/10",
      badge: t("ielts.comingSoon"),
    },
    {
      href: "/ielts/materials",
      icon: BookOpenText,
      title: t("ielts.materialsTitle"),
      body: t("ielts.materialsBody"),
      tone: "from-cyan-500/18 to-sky-500/10",
      badge: null,
    },
    {
      href: "/ielts/tips",
      icon: Lightbulb,
      title: t("ielts.tipsTitle"),
      body: t("ielts.tipsBody"),
      tone: "from-amber-500/18 to-orange-500/10",
      badge: null,
    },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-[linear-gradient(135deg,rgba(99,91,255,0.18),rgba(15,23,42,0.95)_40%,rgba(45,212,191,0.1))] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2.2rem] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-300" />
              {t("ielts.hubEyebrow")}
            </div>
            <h1 className="mt-4 max-w-[14ch] text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              {t("ielts.hubTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {t("ielts.hubSubtitle")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/ielts/simulator">
                <Button size="lg" className="w-full sm:w-auto">
                  <Target className="h-4 w-4" />
                  {t("ielts.startMockExam")}
                </Button>
              </Link>
              <Link href="/ielts/writing">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <PenLine className="h-4 w-4" />
                  {t("ielts.practiceWriting")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HubSignal label={t("ielts.signalModules")} value="5" body={t("ielts.signalModulesBody")} />
            <HubSignal label={t("ielts.signalAI")} value="AI" body={t("ielts.signalAIBody")} />
            <HubSignal label={t("ielts.signalBand")} value="5-9" body={t("ielts.signalBandBody")} />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className="group">
              <article className="flex h-full flex-col rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/20 hover:shadow-[var(--surface-shadow-strong)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br ${mod.tone} text-[var(--text-primary)]`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {mod.badge && (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500">
                      {mod.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] group-hover:text-indigo-400">
                  {mod.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {mod.body}
                </p>
              </article>
            </Link>
          );
        })}
      </section>

      {!user && (
        <section className="mt-8 rounded-[1.75rem] border border-indigo-500/15 bg-indigo-500/5 p-6 text-center sm:p-8">
          <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {t("ielts.ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
            {t("ielts.ctaBody")}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">{t("landing.signUp")}</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">{t("landing.logIn")}</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function HubSignal({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.05)] p-4 shadow-[var(--surface-shadow)]">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
