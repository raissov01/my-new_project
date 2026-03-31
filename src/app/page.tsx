import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/layout";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="relative overflow-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--glass-border)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">{t("landing.logIn")}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{t("landing.signUp")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-main">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl" />
          <div className="absolute -right-20 top-40 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl" />
          <div className="absolute -left-20 bottom-20 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Заманауи оқу платформасы
            </div>

            <h1 className="mt-8 text-4xl font-bold leading-[1.15] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Оқуды жаңа деңгейге
              <span className="relative">
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent"> көтеріңіз</span>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              StudyWithRaissov — флешкарталар, тесттер, челленджтер және басқа да құралдар біріктірілген жан-жақты оқу экожүйесі. Студенттер мен оқытушыларға арналған.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full shadow-lg shadow-blue-500/20 sm:w-auto">
                  Оқуды бастау
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Мүмкіндіктерді көру
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBadge icon={Users} value="500+" label="Студенттер" />
            <StatBadge icon={Layers} value="2000+" label="Жинақтар" />
            <StatBadge icon={Target} value="95%" label="Дәлдік" />
            <StatBadge icon={Trophy} value="50+" label="Челленджтер" />
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 lg:grid-cols-[180px,1fr]">
            <div className="rounded-[28px] border border-white/60 bg-slate-950/95 p-6 shadow-lg shadow-slate-950/10">
              <div className="flex h-full min-h-[150px] items-center justify-center">
                <Image
                  src="/brand-mark.svg"
                  alt="StudyWithRaissov brand mark"
                  width={92}
                  height={92}
                  className="h-[92px] w-[92px]"
                />
              </div>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-500">
                    Brand system
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    Premium identity for web and app
                  </h3>
                </div>
                <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                  New
                </div>
              </div>
              <div className="mt-5 rounded-3xl border border-slate-200/70 bg-slate-950/95 p-4 dark:border-white/10">
                <Image
                  src="/brand-lockup.svg"
                  alt="StudyWithRaissov logo lockup"
                  width={312}
                  height={64}
                  className="h-auto w-full max-w-[312px]"
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Distinctive symbol for navbar, favicon, app icon, and social branding with
                a futuristic violet-to-electric-blue visual system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="relative border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Платформа мүмкіндіктері
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Бір платформа — көптеген оқу құралдары
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              StudyWithRaissov тек флешкарталар емес. Бұл — оқудың барлық қырларын қамтитын толық экожүйе.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FeatureCard
              icon={Layers}
              title="Флешкарталар"
              description="Карточкалар жасап, 3D аудару арқылы жаттаңыз. Қиын карточкаларды белгілеп, қайталаңыз."
              color="indigo"
            />
            <FeatureCard
              icon={ListChecks}
              title="Тест режимі"
              description="Көп нұсқалы тесттерден өтіп, білім деңгейіңізді тексеріңіз."
              color="blue"
            />
            <FeatureCard
              icon={PenLine}
              title="Жазу режимі"
              description="Жауапты өзіңіз жазып, жад арқылы есте сақтау қабілетін дамытыңыз."
              color="cyan"
            />
            <FeatureCard
              icon={Trophy}
              title="Челленджтер"
              description="Сыныптастарыңызбен жарысып, рейтингте көш бастаңыз."
              color="amber"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Прогресс бақылау"
              description="XP, деңгей, стрик және статистика арқылы даму жолыңызды көріңіз."
              color="emerald"
            />
            <FeatureCard
              icon={Users}
              title="Сынып кеңістігі"
              description="Оқытушылар сынып құрып, тапсырмалар мен челленджтер тағайындай алады."
              color="violet"
            />
            <FeatureCard
              icon={Brain}
              title="AI көмекшісі"
              description="Жақында: құжаттардан автоматты флешкарталар жасау."
              color="rose"
              badge="Жақында"
            />
            <FeatureCard
              icon={FileText}
              title="Материалдар"
              description="Жақында: PDF, Word файлдарынан оқу материалдарын импорттау."
              color="orange"
              badge="Жақында"
            />
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Қалай жұмыс істейді
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              4 қарапайым қадам
            </h2>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step={1}
              icon={GraduationCap}
              title="Тіркеліңіз"
              description="Тегін аккаунт жасап, платформаға кіріңіз."
            />
            <StepCard
              step={2}
              icon={LayoutDashboard}
              title="Жинақ құрыңыз"
              description="Флешкарталар жинағын құрып немесе сыныпқа қосылыңыз."
            />
            <StepCard
              step={3}
              icon={Zap}
              title="Оқуды бастаңыз"
              description="Флешкарталар, тест, жазу — өзіңізге ыңғайлы тәсілді таңдаңыз."
            />
            <StepCard
              step={4}
              icon={TrendingUp}
              title="Нәтижеге жетіңіз"
              description="Прогресті бақылап, стрик жинап, деңгейіңізді арттырыңыз."
            />
          </div>
        </div>
      </section>

      {/* ── Why choose us ───────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Неге StudyWithRaissov?
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Оқудың жаңа стандарты
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                Бұл платформа пассивті оқуды белсенді, интерактивті және нәтижелі процеске айналдырады.
              </p>

              <div className="mt-8 space-y-5">
                <BenefitItem text="Белсенді оқу әдістері: тест, жазу, қайталау" />
                <BenefitItem text="Ойын элементтері: XP, деңгей, стрик, жетістіктер" />
                <BenefitItem text="Оқытушы мен студент үшін бірдей ыңғайлы" />
                <BenefitItem text="Болашақ AI құралдарына дайын архитектура" />
                <BenefitItem text="Мобильді құрылғыларда тамаша жұмыс істейді" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Студенттерге</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <li>• Тағайындалған жинақтар</li>
                  <li>• Жеке прогресс</li>
                  <li>• Челлендж рейтингтері</li>
                  <li>• Мобильді оқу</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Оқытушыларға</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <li>• Сынып құру</li>
                  <li>• Тапсырма тағайындау</li>
                  <li>• Рейтинг жүргізу</li>
                  <li>• Прогресс бақылау</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 px-6 py-16 text-center text-white shadow-2xl shadow-blue-500/20 sm:px-12 sm:py-20">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Бүгіннен бастаңыз
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-blue-100">
                StudyWithRaissov-қа қосылып, оқу тәжірибеңізді жақсартыңыз. Тіркелу тегін.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="w-full bg-white text-indigo-700 shadow-lg hover:bg-blue-50 sm:w-auto">
                    Тегін тіркелу
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 sm:w-auto">
                    Кіру
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <BrandLogo />
              </Link>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Заманауи оқу платформасы — студенттер мен оқытушыларға арналған.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Платформа</h4>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li><Link href="/signup" className="transition-colors hover:text-[var(--text-primary)]">Тіркелу</Link></li>
                <li><Link href="/login" className="transition-colors hover:text-[var(--text-primary)]">Кіру</Link></li>
                <li><Link href="#features" className="transition-colors hover:text-[var(--text-primary)]">Мүмкіндіктер</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Оқу құралдары</h4>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li>Флешкарталар</li>
                <li>Тест режимі</li>
                <li>Челленджтер</li>
                <li>Прогресс бақылау</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Құқықтық</h4>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <li>Құпиялылық саясаты</li>
                <li>Пайдалану шарттары</li>
                <li>Байланыс</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-[var(--border)] pt-8 text-center text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} StudyWithRaissov. Барлық құқықтар қорғалған.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function StatBadge({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center shadow-sm">
      <Icon className="mx-auto h-5 w-5 text-indigo-500" />
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  badge,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
  color: string;
  badge?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-600",
    blue: "bg-blue-500/10 text-blue-600",
    cyan: "bg-cyan-500/10 text-cyan-600",
    amber: "bg-amber-500/10 text-amber-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    violet: "bg-violet-500/10 text-violet-600",
    rose: "bg-rose-500/10 text-rose-600",
    orange: "bg-orange-500/10 text-orange-600",
  };

  return (
    <div className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-500/20">
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
          {badge}
        </span>
      )}
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${colorMap[color] ?? colorMap.indigo}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  icon: typeof GraduationCap;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
        {step}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}
