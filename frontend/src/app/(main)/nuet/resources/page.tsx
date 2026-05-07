import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calculator, ExternalLink, FileText, Globe2, Sparkles } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.resources.metaTitle"),
    description: t("nuet.resources.metaDesc"),
    alternates: { canonical: "/nuet/resources" },
  };
}

type ResourceLink = {
  label: string;
  url: string;
  description: string;
  category: "theory" | "practice" | "tools" | "collections";
};

// Sourced verbatim from backend/nuet-materials/tree.json (Resources +
// Materials sections of @nuetchalka_bot). Categories assigned by intended
// study use so the page reads as a curated guide instead of a flat list.
const RESOURCES: ResourceLink[] = [
  {
    label: "Khan Academy",
    url: "https://www.khanacademy.org/math",
    description:
      "Free video lessons + interactive practice across the entire NUET Math syllabus. Best starting point if you are revisiting a topic from scratch.",
    category: "theory",
  },
  {
    label: "Math is Fun",
    url: "https://www.mathsisfun.com/",
    description:
      "Plain-English explanations with worked diagrams. Great for circle theorems, vectors and bearings — the visual topics.",
    category: "theory",
  },
  {
    label: "ExamSolutions",
    url: "https://www.examsolutions.net/",
    description:
      "Step-by-step video walkthroughs of past exam questions. Pacing matches NUET-style multi-step algebra and trig.",
    category: "theory",
  },
  {
    label: "Maths Genie",
    url: "https://www.mathsgenie.co.uk/gcse.php",
    description:
      "GCSE-grade past papers with solutions. Most NUET Math topics map directly to GCSE Higher tier.",
    category: "practice",
  },
  {
    label: "Mathspace",
    url: "https://mathspace.co/textbooks/syllabuses/Syllabus-1083",
    description:
      "Adaptive practice questions tied to a syllabus path. Use it to target weak topics flagged on your dashboard.",
    category: "practice",
  },
  {
    label: "Corbettmaths",
    url: "https://corbettmaths.com/",
    description:
      "Topic-specific worksheets + 5-a-day mixed practice. Print-ready and exam-style.",
    category: "practice",
  },
  {
    label: "Desmos Graphing Calculator",
    url: "https://www.desmos.com/calculator",
    description:
      "Online graphing tool. Use it to verify parabola transformations, vector operations and coordinate-geometry questions visually.",
    category: "tools",
  },
  {
    label: "Vitaliy NUET Math Collection",
    url: "https://decorous-giant-147.notion.site/NUET-Math-14178777b7b980bb932ceef73dc354e0",
    description:
      "Comprehensive Notion collection of NUET Math materials, exercises and revision notes maintained by Vitaliy. Single best external archive.",
    category: "collections",
  },
];

export default async function NUETResourcesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const groups: Array<{ key: ResourceLink["category"]; titleKey: string; icon: typeof BookOpen }> = [
    { key: "theory", titleKey: "nuet.resources.categoryTheory", icon: BookOpen },
    { key: "practice", titleKey: "nuet.resources.categoryPractice", icon: FileText },
    { key: "tools", titleKey: "nuet.resources.categoryTools", icon: Calculator },
    { key: "collections", titleKey: "nuet.resources.categoryCollections", icon: Sparkles },
  ];

  return (
    <article className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToHub")}
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2 text-xs">
          <Globe2 className="h-4 w-4 text-[var(--primary)]" />
          <span className="font-mono uppercase tracking-widest text-[var(--text-muted)]">
            EXTERNAL · @nuetchalka_bot
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {t("nuet.resources.title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
          {t("nuet.resources.subtitle")}
        </p>
      </header>

      <div className="mt-6 space-y-8">
        {groups.map((group) => {
          const items = RESOURCES.filter((r) => r.category === group.key);
          if (items.length === 0) return null;
          const Icon = group.icon;
          return (
            <section key={group.key}>
              <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                <Icon className="h-4 w-4 text-[var(--primary)]" />
                {t(group.titleKey)}
                <span className="ml-auto rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)]">
                  {items.length}
                </span>
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--primary)]"
                  >
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {item.description}
                      </p>
                      <p className="mt-2 truncate font-mono text-[10px] text-[var(--text-muted)]">
                        {hostname(item.url)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
