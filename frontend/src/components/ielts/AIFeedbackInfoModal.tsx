"use client";

import { useState } from "react";
import { X, Sparkles, CheckCircle2, BookOpen, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const CRITERIA = [
  {
    name: "Task Response / Task Achievement",
    code: "TR",
    color: "text-blue-500 bg-blue-500/10",
    desc: "Тапсырма талабын орындау дәрежесі — аргумент толықтығы, позиция анықтығы.",
  },
  {
    name: "Coherence & Cohesion",
    code: "CC",
    color: "text-emerald-500 bg-emerald-500/10",
    desc: "Ойлардың логикалық ағымы, абзац ұйымдастыруы, байланысты сөздер пайдалануы.",
  },
  {
    name: "Lexical Resource",
    code: "LR",
    color: "text-violet-500 bg-violet-500/10",
    desc: "Сөздік қор байлығы, дұрыс тіркестер қолдануы, орфографиялық дәлдік.",
  },
  {
    name: "Grammatical Range & Accuracy",
    code: "GR",
    color: "text-amber-500 bg-amber-500/10",
    desc: "Грамматикалық құрылымдардың алуантүрлілігі мен дәлдігі, пунктуация.",
  },
];

const EXAMPLE_FEEDBACK = {
  task: "Writing Task 2",
  topic: "Technology simplifies or complicates life",
  band: 6.5,
  breakdown: { TR: 7.0, CC: 6.5, LR: 6.0, GR: 6.5 },
  comment:
    "Жақсы аргументтер ұсынылды, бірақ Coherence-та параграф байланысы ойлы болмаған. Лексика жеткілікті, бірақ academic collocations азырақ. Грамматикада complex sentences бар, алайда кейбір қателер бар.",
};

interface Props {
  label: string;
  value: string;
  body: string;
  accent: string;
}

export function AIFeedbackSignal({ label, value, body, accent }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`
          w-full text-left rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] ${accent}
          bg-[var(--bg-soft)] p-4 transition-colors
          hover:bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]
        `}
        aria-label="AI кері байланыс туралы толығырақ"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
          {value}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[var(--primary)]">
          <ExternalLink className="h-3 w-3" />
          Толығырақ білу →
        </p>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="AI кері байланыс туралы">
        {/* Model info */}
        <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              OpenAI GPT-4o mini
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Writing & Speaking бағалауы · IELTS official rubric негізінде
            </p>
          </div>
        </div>

        {/* IELTS Criteria */}
        <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Бағалау критерийлері (IELTS Official Band Descriptors)
        </p>
        <div className="mb-5 space-y-2">
          {CRITERIA.map((c) => (
            <div
              key={c.code}
              className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-3"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${c.color}`}
              >
                {c.code}
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{c.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Example feedback */}
        <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Үлгі кері байланыс
        </p>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                {EXAMPLE_FEEDBACK.task} · {EXAMPLE_FEEDBACK.topic}
              </p>
            </div>
            <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--primary)]">
              Band {EXAMPLE_FEEDBACK.band}
            </span>
          </div>

          {/* Breakdown */}
          <div className="mb-3 grid grid-cols-4 gap-2">
            {Object.entries(EXAMPLE_FEEDBACK.breakdown).map(([key, score]) => (
              <div key={key} className="rounded-lg bg-[var(--bg-elevated)] p-2 text-center">
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">{key}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{score}</p>
              </div>
            ))}
          </div>

          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            {EXAMPLE_FEEDBACK.comment}
          </p>
        </div>

        {/* Bottom note */}
        <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-lg)] border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          AI бағалауы IELTS-тің ресми band descriptor-ларына сәйкестендірілген, бірақ нақты емтихан нәтижесін алмастырмайды.
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={() => setOpen(false)}>Жабу</Button>
        </div>
      </Modal>
    </>
  );
}
