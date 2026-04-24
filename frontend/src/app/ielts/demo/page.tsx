import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, PenLine, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "IELTS демо | StudyWithRaissov",
  description:
    "Тіркелмей-ақ IELTS дайындық платформасын сынап көріңіз: Reading passage және Writing Task үлгілері.",
  robots: { index: true, follow: true },
};

const DEMO_PASSAGE = {
  title: "The Rise of Remote Work",
  text: `Remote work, once considered a privilege afforded to a select few, has transformed into a mainstream work arrangement for millions of professionals worldwide. The COVID-19 pandemic accelerated this shift dramatically, compelling organisations to adapt their operations almost overnight.

Studies indicate that remote workers often report higher levels of job satisfaction, primarily due to the elimination of commuting time and greater flexibility in managing personal and professional commitments. A 2022 survey by Stanford University found that productivity among remote workers increased by approximately 13% compared to their office-based counterparts.

However, remote work is not without its drawbacks. Social isolation remains a significant concern, with many employees reporting feelings of disconnection from their colleagues and company culture. Furthermore, the blurring of boundaries between work and personal life can lead to burnout if not managed effectively.

Organisations are now adopting hybrid models — combining remote and in-office work — as a compromise that seeks to balance flexibility with the collaborative benefits of physical presence. The long-term implications of this shift for urban planning, commercial real estate, and public transport systems remain subjects of considerable debate.`,
};

const DEMO_QUESTIONS = [
  {
    id: 1,
    text: "Remote work was widely available to most employees before the pandemic.",
    type: "TRUE / FALSE / NOT GIVEN",
    answer: "FALSE",
  },
  {
    id: 2,
    text: "The Stanford study showed remote workers were 13% more productive.",
    type: "TRUE / FALSE / NOT GIVEN",
    answer: "TRUE",
  },
  {
    id: 3,
    text: "All companies have now permanently switched to fully remote work.",
    type: "TRUE / FALSE / NOT GIVEN",
    answer: "NOT GIVEN",
  },
];

const DEMO_WRITING_TASK = {
  task: "Task 2",
  prompt: `Some people believe that technology has made our lives more complicated. Others argue that technology simplifies our lives.

Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
};

export default function IELTSDemoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a18]">
      {/* Nav stub */}
      <header className="border-b border-white/[0.06] bg-[#0a0a18] px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-white">
            StudyWithRaissov
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                Кіру
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-[#5533ff] text-white hover:bg-[#4422ee]">
                Тіркелу — тегін
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#5533ff]/30 bg-[#5533ff]/10 px-4 py-1.5 text-sm font-medium text-[#a07cfc]">
            <GraduationCap className="h-4 w-4" />
            IELTS дайындық демосы
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            IELTS платформасын сынап көріңіз
          </h1>
          <p className="mt-3 text-base text-white/60">
            Тіркелмей-ақ Reading және Writing үлгілерін көріңіз. Толық мүмкіндіктер үшін аккаунт жасаңыз.
          </p>
        </div>

        {/* Demo 1: Reading Passage */}
        <section className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Reading Demo
              </span>
              <h2 className="text-lg font-bold text-white">{DEMO_PASSAGE.title}</h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Passage */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0f0f1e] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Passage</p>
              <p className="whitespace-pre-line text-sm leading-7 text-white/70">
                {DEMO_PASSAGE.text}
              </p>
            </div>

            {/* Questions */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                Questions 1–3 · True / False / Not Given
              </p>
              <div className="space-y-3">
                {DEMO_QUESTIONS.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-white/[0.06] bg-[#0f0f1e] p-4"
                  >
                    <p className="text-sm text-white/80">
                      <span className="mr-2 font-bold text-white">{q.id}.</span>
                      {q.text}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
                        <button
                          key={opt}
                          disabled
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/40"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-white/30">
                      Жауап тіркелгеннен кейін ашылады →
                      <span className="ml-1 font-semibold text-cyan-400">{q.answer}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Demo 2: Writing Task */}
        <section className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <PenLine className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Writing Demo · {DEMO_WRITING_TASK.task}
              </span>
              <h2 className="text-lg font-bold text-white">AI кері байланысымен эссе жазу</h2>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0f0f1e] p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Тапсырма:</p>
            <p className="whitespace-pre-line text-sm leading-7 text-white/80">
              {DEMO_WRITING_TASK.prompt}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0f0f1e] p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">
              Жауабыңызды осында жазыңыз:
            </p>
            <div className="min-h-[120px] rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-sm text-white/20 italic">
                Жазу функциясы аккаунтты талап етеді. Тіркеліңіз →
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#5533ff]/20 bg-[#5533ff]/5 p-3 text-xs text-[#a07cfc]">
              ✦ Толық нұсқада: AI автоматты бағалайды, Band score + 4 критерий бойынша кері байланыс береді
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-[#5533ff]/20 bg-[#5533ff]/5 p-8 text-center">
          <h2 className="text-2xl font-extrabold text-white">
            Толық мүмкіндіктерге қол жеткізіңіз
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Тегін тіркеліп, AI бағалауы, mock емтихан, оқу жоспары және прогресс қадағалауын пайдаланыңыз.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-[#5533ff] text-white hover:bg-[#4422ee]">
                Тегін аккаунт жасау
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ielts">
              <Button size="lg" variant="ghost" className="text-white/70 hover:text-white">
                IELTS хабын қарау
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
