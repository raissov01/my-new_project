import { redirect } from "next/navigation";
import { Crown, CheckCircle2, Zap, BookOpen, Brain, Mic, Trophy, Gift, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getBillingStatus } from "@/features/settings/api";
import { Button } from "@/components/ui/button";
import { PromoCheckout } from "./promo-checkout";

const PRO_FEATURES = [
  { icon: BookOpen, text: "Шексіз English Simulator сабақтары" },
  { icon: Brain,    text: "Толық IELTS тренажеры — Reading, Writing, Listening, Speaking" },
  { icon: Zap,      text: "AI Tutor — шексіз хабарламалар" },
  { icon: Trophy,   text: "AI Quiz генерация — кез-келген тақырыпта" },
  { icon: Mic,      text: "Speaking Practice — AI бағалауымен" },
  { icon: Crown,    text: "Барлық жаңа мүмкіндіктерге бірінші қол жеткізу" },
];

const FREE_FEATURES = [
  "Күніне 5 сабақ (English Simulator)",
  "3 IELTS тест/ай",
  "AI Tutor — 10 хабарлама/күн",
  "Flashcard жиындары",
  "Leaderboard, achievements",
];

export default async function UpgradePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const billing = await getBillingStatus();
  if (billing?.isPro) redirect("/settings?upgraded=1");

  const checkoutURL = billing?.checkoutURL ?? "";
  // Trial checkout — same URL with trial flag (LemonSqueezy handles trial if enabled on product)
  const trialCheckoutURL = checkoutURL
    ? `${checkoutURL}&checkout[custom][trial]=true`
    : "";

  return (
    <>
      <script src="https://assets.lemonsqueezy.com/lemon.js" defer />

      <div className="page-shell py-10 sm:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 mb-4">
              <Crown className="h-4 w-4" />
              StudyWithRaissov Pro
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] mb-4">
              Шексіз оқу мүмкіндігі
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              AI-мен оқудың толық күшін ашыңыз. IELTS дайындығы, ағылшын тілі,
              AI сабақтар — бәрі бір жазылымда.
            </p>
          </div>

          {/* 3 cards */}
          <div className="grid gap-5 sm:grid-cols-3 items-stretch">

            {/* ── FREE ── */}
            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">$0</span>
                  <span className="text-[var(--text-muted)] mb-1">/ай</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">Мәңгілік тегін</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Ағымдағы жоспар
              </Button>
            </div>

            {/* ── 7-DAY TRIAL ── */}
            <div className="flex flex-col relative rounded-2xl border-2 border-green-500 bg-[var(--bg-surface)] p-6 shadow-[0_0_0_4px_rgba(34,197,94,0.1)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-green-500 px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
                  7 КҮН ТЕГІН TRIAL
                </span>
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3 flex items-center gap-1.5">
                  <Gift className="h-4 w-4" /> Тегін сынап көр
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">$0</span>
                  <span className="text-[var(--text-muted)] mb-1">/7 күн</span>
                </div>
                <p className="text-sm text-green-400 mt-2 font-medium">
                  Одан кейін автоматты $9/ай
                </p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {PRO_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Icon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>

              {trialCheckoutURL ? (
                <div className="space-y-2">
                  <a
                    href={trialCheckoutURL}
                    className="lemonsqueezy-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-600 px-4 py-3 text-base font-bold text-white transition-colors"
                    rel="noopener noreferrer"
                  >
                    <Gift className="h-4 w-4" />
                    7 күн тегін бастау
                  </a>
                  <p className="text-center text-xs text-[var(--text-muted)]">
                    Картаңыз тіркеледі. 7 күннен кейін $9/ай алынады.
                    Кез-келген уақытта бас тарта аласыз.
                  </p>
                </div>
              ) : (
                <button disabled className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-200 px-4 py-3 text-base font-bold text-green-700 cursor-not-allowed">
                  <Gift className="h-4 w-4" /> Жүктелуде...
                </button>
              )}
            </div>

            {/* ── PRO ── */}
            <div className="flex flex-col relative rounded-2xl border-2 border-yellow-400 bg-[var(--bg-surface)] p-6 shadow-[0_0_0_4px_rgba(234,179,8,0.1)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-yellow-400 px-4 py-1 text-xs font-bold text-yellow-900 whitespace-nowrap">
                  ЕҢ ТАНЫМАЛ
                </span>
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3 flex items-center gap-1.5">
                  <Crown className="h-4 w-4" /> Pro
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">$9</span>
                  <span className="text-[var(--text-muted)] mb-1">/ай</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">немесе $79/жыл (үнемдеу $29)</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {PRO_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Icon className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>

              {checkoutURL ? (
                <PromoCheckout baseCheckoutURL={checkoutURL} />
              ) : (
                <button disabled className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-200 px-4 py-3 text-base font-bold text-yellow-600 cursor-not-allowed">
                  <Crown className="h-4 w-4" /> Жүктелуде...
                </button>
              )}
            </div>
          </div>

          {/* Support */}
          <div className="mt-10 text-center text-sm text-[var(--text-muted)]">
            Сұрақтар бар ма?{" "}
            <a
              href="https://t.me/raissov01"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--text-secondary)]"
            >
              Telegram: @raissov01
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
