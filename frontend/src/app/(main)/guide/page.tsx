import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Layers,
  ListChecks,
  PenLine,
  Brain,
  Timer,
  Flame,
  Star,
  Trophy,
  User,
  Settings,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export const metadata: Metadata = {
  title: "Нұсқаулық",
  description: "StudyWithRaissov платформасын қалай пайдалану керек — флешкарталар, квиздер, IELTS дайындығы және AI-қолдауы туралы толық нұсқаулық.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "Нұсқаулық — StudyWithRaissov",
    description: "Платформаны қалай пайдалану керек — толық нұсқаулық.",
    url: "/guide",
    locale: "kk_KZ",
  },
  robots: { index: true, follow: true },
};
import { getCurrentUser } from "@/server/auth";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";

export default async function GuidePage() {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={user ? "/dashboard" : "/"} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("guide.backToDashboard")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("guide.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            Нұсқаулық
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--primary-soft)] p-3 shadow-[var(--shadow-md)]">
            <Sparkles className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              {t("guide.title")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("guide.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        {/* 1. Create a Set */}
        <GuideSection
          number={1}
          icon={BookOpen}
          title={t("guide.createSetTitle")}
          description={t("guide.createSetBody")}
          color="indigo"
          steps={[
            t("guide.createStep1"),
            t("guide.createStep2"),
            t("guide.createStep3"),
          ]}
        />

        {/* 2. Start Studying */}
        <GuideSection
          number={2}
          icon={Zap}
          title={t("guide.startStudyTitle")}
          description={t("guide.startStudyBody")}
          color="emerald"
          steps={[
            t("guide.studyStep1"),
            t("guide.studyStep2"),
            t("guide.studyStep3"),
          ]}
        />

        {/* 3. Study Modes */}
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 text-sm font-bold text-purple-600">
              3
            </span>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {t("guide.modesTitle")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {t("guide.modesBody")}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <ModeCard
              icon={Layers}
              title={t("guide.modeFlashcardTitle")}
              body={t("guide.modeFlashcardBody")}
              color="indigo"
            />
            <ModeCard
              icon={ListChecks}
              title={t("guide.modeQuizTitle")}
              body={t("guide.modeQuizBody")}
              color="emerald"
            />
            <ModeCard
              icon={PenLine}
              title={t("guide.modeWriteTitle")}
              body={t("guide.modeWriteBody")}
              color="amber"
            />
          </div>
        </div>

        {/* 4. Smart Study */}
        <GuideSection
          number={4}
          icon={Brain}
          title={t("guide.smartStudyTitle")}
          description={t("guide.smartStudyBody")}
          color="violet"
          steps={[
            t("guide.smartStep1"),
            t("guide.smartStep2"),
            t("guide.smartStep3"),
          ]}
        />

        {/* 5. Pomodoro */}
        <GuideSection
          number={5}
          icon={Timer}
          title={t("guide.pomodoroTitle")}
          description={t("guide.pomodoroBody")}
          color="red"
          steps={[
            t("guide.pomodoroStep1"),
            t("guide.pomodoroStep2"),
            t("guide.pomodoroStep3"),
          ]}
        />

        {/* 6. Gamification */}
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-600">
              6
            </span>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {t("guide.gamificationTitle")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {t("guide.gamificationBody")}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <ModeCard
              icon={Flame}
              title={t("guide.streakTitle")}
              body={t("guide.streakBody")}
              color="orange"
            />
            <ModeCard
              icon={Star}
              title={t("guide.xpTitle")}
              body={t("guide.xpBody")}
              color="amber"
            />
            <ModeCard
              icon={Target}
              title={t("guide.achievementsTitle")}
              body={t("guide.achievementsBody")}
              color="emerald"
            />
          </div>
        </div>

        {/* 7. Leaderboard */}
        <GuideSection
          number={7}
          icon={Trophy}
          title={t("guide.leaderboardTitle")}
          description={t("guide.leaderboardBody")}
          color="amber"
          steps={[
            t("guide.leaderboardStep1"),
            t("guide.leaderboardStep2"),
            t("guide.leaderboardStep3"),
          ]}
        />

        {/* 8. Profile & Settings */}
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-600">
              8
            </span>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {t("guide.profileSettingsTitle")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {t("guide.profileSettingsBody")}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ModeCard
              icon={User}
              title={t("guide.profileTitle")}
              body={t("guide.profileBody")}
              color="indigo"
            />
            <ModeCard
              icon={Settings}
              title={t("guide.settingsTitle")}
              body={t("guide.settingsBody")}
              color="slate"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-[var(--radius-2xl)] bg-[var(--primary)] p-8 text-center text-white shadow-[var(--shadow-lg)]">
        <h2 className="text-2xl font-bold">{t("guide.ctaTitle")}</h2>
        <p className="mt-2 text-sm text-white/80">{t("guide.ctaBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={user ? "/dashboard" : "/sets"}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
          >
            {user ? t("guide.ctaStart") : t("guest.exploreLibrary")}
          </Link>
          {user ? (
            <Link
              href="/sets/new"
              className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t("guide.ctaCreate")}
            </Link>
          ) : (
            <AuthRequiredPrompt
              triggerLabel={t("guide.ctaCreate")}
              title={t("guest.authRequiredTitle")}
              description={t("guest.createPrompt")}
              signupLabel={t("guest.signUpToContinue")}
              loginLabel={t("guest.logInToUnlock")}
              cancelLabel={t("set.cancel")}
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

const COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-500/15 text-indigo-600",
  emerald: "bg-emerald-500/15 text-emerald-600",
  purple: "bg-purple-500/15 text-purple-600",
  violet: "bg-violet-500/15 text-violet-600",
  red: "bg-red-500/15 text-red-600",
  amber: "bg-amber-500/15 text-amber-600",
  orange: "bg-orange-500/15 text-orange-600",
  sky: "bg-sky-500/15 text-sky-600",
  slate: "bg-gray-500/15 text-gray-600",
};

function GuideSection({
  number,
  icon: Icon,
  title,
  description,
  color,
  steps,
}: {
  number: number;
  icon: typeof BookOpen;
  title: string;
  description: string;
  color: string;
  steps: string[];
}) {
  const colorClass = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${colorClass}`}
        >
          {number}
        </span>
        <Icon className={`h-5 w-5 ${colorClass.split(" ")[1]}`} />
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
      <ol className="mt-4 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-muted)]">
              {i + 1}
            </span>
            <span className="text-[var(--text-secondary)]">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  body,
  color,
}: {
  icon: typeof Layers;
  title: string;
  body: string;
  color: string;
}) {
  const colorClass = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <div className="rounded-2xl bg-[var(--bg-surface)] p-4">
      <div className={`w-fit rounded-xl p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}
