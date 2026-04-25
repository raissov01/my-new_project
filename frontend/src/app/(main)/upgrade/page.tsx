import { redirect } from "next/navigation";
import { Crown, CheckCircle2, Zap, BookOpen, Brain, Mic, Trophy, Gift } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getBillingStatus } from "@/features/settings/api";
import { Button } from "@/components/ui/button";
import { PromoCheckout } from "./promo-checkout";

const PRO_FEATURES = [
  { icon: BookOpen,  text: "Шексіз English Simulator сабақтары (барлық деңгейлер)" },
  { icon: Brain,     text: "Толық IELTS тренажеры — Reading, Writing, Listening, Speaking" },
  { icon: Zap,       text: "AI Tutor — шексіз хабарламалар" },
  { icon: Trophy,    text: "AI Quiz генерация — кез-келген тақырыпта" },
  { icon: Mic,       text: "Speaking Practice — AI бағалауымен" },
  { icon: Crown,     text: "Барлық жаңа мүмкіндіктерге бірінші қол жеткізу" },
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

  if (billing?.isPro) {
    redirect("/settings?upgraded=1");
  }

  return (
    <>
      {/* Lemon Squeezy overlay script */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://assets.lemonsqueezy.com/lemon.js" defer />

      <div className="page-shell py-10 sm:py-16">
        <div className="mx-auto max-w-4xl">
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

            {/* Trial badge */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-5 py-2 text-sm font-semibold text-green-400">
              <Gift className="h-4 w-4" />
              7 күн тегін — картаңызды тіркеп, кез-келген уақытта бас тарта аласыз
            </div>
          </div>

          {/* Plans */}
          <div className="grid gap-5 sm:grid-cols-2 items-start">
            {/* Free */}
            <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">$0</span>
                  <span className="text-[var(--text-muted)] mb-1">/ай</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">Мәңгілік тегін</p>
              </div>
              <ul className="space-y-3 mb-8">
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

            {/* Pro */}
            <div className="relative rounded-[var(--radius-2xl)] border-2 border-yellow-400 bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_0_0_4px_rgba(234,179,8,0.1)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-yellow-400 px-4 py-1 text-xs font-bold text-yellow-900">
                  7 КҮН ТЕГІН
                </span>
              </div>
              <div className="mb-6">
                <p className="text-sm font-semibold text-yellow-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Crown className="h-4 w-4" /> Pro
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">$9</span>
                  <span className="text-[var(--text-muted)] mb-1">/ай</span>
                </div>
                <p className="text-sm text-green-400 mt-2 font-medium">
                  Алғашқы 7 күн тегін, одан кейін $9/ай
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Icon className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
              {billing?.checkoutURL ? (
                <PromoCheckout baseCheckoutURL={billing.checkoutURL} />
              ) : (
                <button
                  disabled
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-yellow-200 px-4 py-3 text-base font-bold text-yellow-600 cursor-not-allowed"
                >
                  <Crown className="h-4 w-4" />
                  Жүктелуде...
                </button>
              )}
            </div>
          </div>

          {/* Trial note */}
          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            7 күндік тегін кезеңде картадан ақша алынбайды. Триал аяқталса автоматты жазылым басталады.
            Кез-келген уақытта бас тарта аласыз.
          </p>

          {/* Support */}
          <div className="mt-8 text-center text-sm text-[var(--text-muted)]">
            <p>
              Сұрақтар бар ма?{" "}
              <a
                href="https://t.me/raissov01"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--text-secondary)]"
              >
                Telegram: @raissov01
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
