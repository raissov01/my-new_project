import Link from "next/link";
import { ArrowRight, Brain, FileText, GraduationCap, ShieldCheck, Sparkles, Users } from "lucide-react";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const t = createTranslator(await getServerLocale());

  return (
    <div className="relative overflow-hidden bg-gradient-main">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">FlashLearn</p>
              <p className="text-sm text-[var(--text-secondary)]">
                AI-ready learning platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">{t("landing.logIn")}</Button>
            </Link>
            <Link href="/signup">
              <Button>{t("landing.signUp")}</Button>
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.2fr_0.9fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700">
              <Brain className="h-4 w-4" />
              Prepared for AI flashcard generation from PDF and Word files
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Modern study workflows for students, teachers, and the next wave of AI-assisted learning.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              {t("landing.subtitle")} Build private classrooms, assign learning challenges,
              track rankings, and stay ready for future AI-powered content creation.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start building
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Open existing workspace
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <MiniFeature
                icon={GraduationCap}
                title="Student dashboards"
                body="Assigned sets, private challenges, and personal progress."
              />
              <MiniFeature
                icon={Users}
                title="Teacher controls"
                body="Class codes, rankings, progress views, and classroom management."
              />
              <MiniFeature
                icon={FileText}
                title="AI-ready architecture"
                body="Prepared for document ingestion and generated flashcard pipelines."
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Student
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Clean daily learning flow
                  </h2>
                </div>
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
                <li>Assigned sets and class-only challenges</li>
                <li>Personal accuracy, streak, and progress visibility</li>
                <li>Simple, mobile-friendly study experience</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Teacher
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Classroom operations in one place
                  </h2>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
                <li>Create classrooms and issue shareable class codes</li>
                <li>Assign sets and launch private rankings</li>
                <li>Review class progress before AI features arrive</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-[var(--border)] py-8 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-4">
            Next.js App Router + TypeScript + Tailwind CSS
          </div>
          <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-4">
            Vercel-ready structure with reusable UI and environment templates
          </div>
          <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-4">
            Prepared for Supabase auth/data and future AI document workflows
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniFeature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Brain;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-indigo-600">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
