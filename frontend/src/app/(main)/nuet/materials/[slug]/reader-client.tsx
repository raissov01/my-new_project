"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List, PlayCircle, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { LessonBlockRenderer } from "@/components/nuet/lesson-blocks";
import type { LessonChapter } from "@/lib/shared/nuet/lesson-schema";

export function LessonReaderClient({
  chapters,
  practiceHref,
}: {
  chapters: LessonChapter[];
  practiceHref: string;
}) {
  const { t } = useLocale();
  // Active chapter is driven by the IntersectionObserver below — the
  // sidebar highlights the chapter currently in view. State doubles as a
  // jump target when the user clicks an item in the sidebar.
  const [activeId, setActiveId] = useState<string>(chapters[0]?.id ?? "");
  const [tocOpen, setTocOpen] = useState(false);
  const sectionsRef = useRef<HTMLDivElement | null>(null);

  // Observe each chapter heading and pick the topmost one that's still
  // intersecting the upper third of the viewport. This is the
  // "scrollspy" trick that keeps the ToC in sync without forcing
  // manual chapter navigation.
  useEffect(() => {
    if (!sectionsRef.current || chapters.length === 0) return;
    const headings = Array.from(
      sectionsRef.current.querySelectorAll<HTMLElement>("[data-chapter-id]")
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-chapter-id");
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [chapters]);

  const indexById = useMemo(() => {
    const m: Record<string, number> = {};
    chapters.forEach((c, i) => {
      m[c.id] = i;
    });
    return m;
  }, [chapters]);

  function scrollToChapter(id: string) {
    const el = document.getElementById(`chapter-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  }

  if (chapters.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
        {t("nuet.lesson.empty")}
      </p>
    );
  }

  const currentIdx = indexById[activeId] ?? 0;
  const prev = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const next = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <ChapterList
          chapters={chapters}
          activeId={activeId}
          onJump={scrollToChapter}
          t={t}
        />
      </aside>

      {/* Mobile ToC trigger */}
      <button
        type="button"
        onClick={() => setTocOpen(true)}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] lg:hidden"
      >
        <List className="h-3.5 w-3.5" />
        {t("nuet.lesson.chapters")}
      </button>

      {/* Mobile ToC drawer */}
      {tocOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setTocOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-xs overflow-y-auto bg-[var(--bg-elevated)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                {t("nuet.lesson.chapters")}
              </span>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-soft)]"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ChapterList
              chapters={chapters}
              activeId={activeId}
              onJump={scrollToChapter}
              t={t}
            />
          </div>
        </div>
      ) : null}

      <div ref={sectionsRef} className="min-w-0 space-y-10">
        {chapters.map((c, idx) => (
          <section
            key={c.id}
            id={`chapter-${c.id}`}
            className="scroll-mt-24"
            data-chapter-id={c.id}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {c.title}
              </h2>
            </div>
            <div className="mt-3 space-y-3">
              {c.blocks.map((b, i) => (
                <LessonBlockRenderer key={i} block={b} t={t} />
              ))}
            </div>
          </section>
        ))}

        {/* End-of-book navigation */}
        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => prev && scrollToChapter(prev.id)}
              disabled={!prev}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("nuet.lesson.prev")}
            </button>
            <button
              type="button"
              onClick={() => next && scrollToChapter(next.id)}
              disabled={!next}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("nuet.lesson.next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <Link
            href={practiceHref}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <PlayCircle className="h-4 w-4" />
            {t("nuet.lesson.practiceCTA")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChapterList({
  chapters,
  activeId,
  onJump,
  t,
}: {
  chapters: LessonChapter[];
  activeId: string;
  onJump: (id: string) => void;
  t: (key: string) => string;
}) {
  return (
    <nav
      aria-label={t("nuet.lesson.chapters")}
      className="sticky top-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
    >
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {t("nuet.lesson.chapters")}
      </p>
      <ol className="space-y-1 text-sm">
        {chapters.map((c, idx) => {
          const active = c.id === activeId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onJump(c.id)}
                className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left transition ${
                  active
                    ? "bg-[var(--bg-base)] text-[var(--primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                }`}
              >
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
