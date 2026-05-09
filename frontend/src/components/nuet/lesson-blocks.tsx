"use client";

import { Lightbulb, AlertTriangle, Info, BookOpen } from "lucide-react";
import { MathText } from "@/components/nuet/math-text";
import type { LessonBlock } from "@/lib/shared/nuet/lesson-schema";

type Translator = (key: string) => string;

export function LessonBlockRenderer({
  block,
  t,
}: {
  block: LessonBlock;
  t: Translator;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-[15px] leading-7 text-[var(--text-primary)]">
          <MathText text={block.text} />
        </p>
      );
    case "heading": {
      const Tag = (block.level === 3 ? "h4" : "h3") as "h3" | "h4";
      const cls =
        block.level === 3
          ? "mt-2 text-base font-semibold text-[var(--text-primary)]"
          : "mt-2 text-lg font-semibold text-[var(--text-primary)]";
      return (
        <Tag className={cls}>
          <MathText text={block.text} />
        </Tag>
      );
    }
    case "formula":
      return (
        <figure className="my-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
          <div className="overflow-x-auto text-center">
            <MathText text={`$$${block.tex}$$`} as="div" className="" />
          </div>
          {block.caption ? (
            <figcaption className="mt-2 text-center text-xs text-[var(--text-muted)]">
              <MathText text={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "list":
      return block.ordered ? (
        <ol className="ml-5 list-decimal space-y-1.5 text-[15px] leading-7 text-[var(--text-primary)] marker:text-[var(--text-muted)]">
          {block.items.map((item, i) => (
            <li key={i}>
              <MathText text={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="ml-5 list-disc space-y-1.5 text-[15px] leading-7 text-[var(--text-primary)] marker:text-[var(--text-muted)]">
          {block.items.map((item, i) => (
            <li key={i}>
              <MathText text={item} />
            </li>
          ))}
        </ul>
      );
    case "definition":
      return (
        <aside className="my-2 rounded-xl border-l-4 border-[var(--primary)] bg-[var(--bg-soft)] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            {t("nuet.lesson.term")}
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
            <MathText text={block.term} />
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            <MathText text={block.text} />
          </p>
        </aside>
      );
    case "callout": {
      const tone = block.tone;
      const Icon = tone === "warning" ? AlertTriangle : tone === "note" ? Info : Lightbulb;
      const palette =
        tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
          : tone === "note"
            ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
            : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200";
      return (
        <div className={`my-2 flex gap-2.5 rounded-xl border px-4 py-3 ${palette}`}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">
            <MathText text={block.text} />
          </p>
        </div>
      );
    }
    case "example":
      return (
        <section className="my-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
            {block.title || t("nuet.lesson.example")}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-6 text-[var(--text-primary)]">
            <MathText text={block.prompt} />
          </p>
          {block.steps.length > 0 ? (
            <ol className="mt-3 space-y-1.5 border-l-2 border-[var(--border)] pl-3 text-sm leading-6 text-[var(--text-secondary)]">
              {block.steps.map((step, i) => (
                <li key={i}>
                  <MathText text={step} />
                </li>
              ))}
            </ol>
          ) : null}
          <p className="mt-3 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.lesson.answer")}
            </span>{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              <MathText text={block.answer} />
            </span>
          </p>
        </section>
      );
    case "exercise":
      return (
        <section className="my-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            {t("nuet.lesson.exercise")}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-6 text-[var(--text-primary)]">
            <MathText text={block.prompt} />
          </p>
          {block.options && block.options.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {block.options.map((opt, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <MathText text={opt} />
                </li>
              ))}
            </ul>
          ) : null}
          <details className="group mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--primary)]">
              {t("nuet.lesson.reveal")}
            </summary>
            <div className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
              <p>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {t("nuet.lesson.answer")}
                </span>{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  <MathText text={block.answer} />
                </span>
              </p>
              {block.explanation ? (
                <p>
                  <MathText text={block.explanation} />
                </p>
              ) : null}
            </div>
          </details>
        </section>
      );
    case "table":
      return (
        <div className="my-2 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-soft)] text-left text-[var(--text-secondary)]">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    <MathText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {block.rows.map((row, ri) => (
                <tr key={ri} className="text-[var(--text-primary)]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top">
                      <MathText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default: {
      // Exhaustiveness check — TS will complain if we miss a block type.
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}

export const LESSON_BOOK_ICON = BookOpen;
