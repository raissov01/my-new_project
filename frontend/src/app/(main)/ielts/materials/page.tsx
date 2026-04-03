import Link from "next/link";
import { ArrowLeft, BookOpen, BookOpenText, GraduationCap, Headphones, Languages, Lightbulb, Mic, PenLine, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { isAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/shared/auth/admin";
import { getMaterials, type IELTSMaterial } from "@/app/(main)/ielts/admin/actions";

const categoryMeta = {
  reading: { icon: BookOpen, tone: "from-blue-500/18 to-indigo-500/10" },
  listening: { icon: Headphones, tone: "from-cyan-500/18 to-sky-500/10" },
  writing: { icon: PenLine, tone: "from-emerald-500/18 to-teal-500/10" },
  speaking: { icon: Mic, tone: "from-violet-500/18 to-fuchsia-500/10" },
} as const;

const typeMeta = {
  lesson: { icon: BookOpenText, color: "border-blue-500/20 bg-blue-500/10 text-blue-400" },
  practice: { icon: GraduationCap, color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" },
  tip: { icon: Lightbulb, color: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
} as const;

export default async function IELTSMaterialsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const cookieStore = await cookies();
  const isAdmin = isAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME));
  const allMaterials = await getMaterials();

  // Group by category
  const categories = ["reading", "listening", "writing", "speaking"] as const;
  const grouped = new Map<string, IELTSMaterial[]>();
  for (const cat of categories) {
    grouped.set(cat, allMaterials.filter((m) => m.category === cat));
  }

  const typeLabels = {
    lesson: t("admin.typeLesson"),
    practice: t("admin.typePractice"),
    tip: t("admin.typeTip"),
  };

  const categoryLabels = {
    reading: t("ielts.matReading"),
    listening: t("ielts.matListening"),
    writing: t("ielts.matWriting" in {} ? "ielts.matWriting" : "ielts.writingTitle"),
    speaking: t("ielts.speakingTitle"),
  };

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/ielts" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-4 w-4" />
          {t("ielts.backToHub")}
        </Link>
        {isAdmin && (
          <Link href="/ielts/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
              {t("admin.manageBtn")}
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {t("ielts.materialsTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{t("ielts.materialsSubtitle")}</p>
      </div>

      {allMaterials.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-16 text-center">
          <BookOpenText className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("admin.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("admin.emptyPublicBody")}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {categories.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;

            const meta = categoryMeta[cat];
            const Icon = meta.icon;

            // Sub-group by type
            const lessons = items.filter((m) => m.type === "lesson");
            const practices = items.filter((m) => m.type === "practice");
            const tips = items.filter((m) => m.type === "tip");

            return (
              <section key={cat}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-gradient-to-br ${meta.tone}`}>
                    <Icon className="h-5 w-5 text-[var(--text-primary)]" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {categoryLabels[cat]}
                  </h2>
                </div>

                <div className="mt-5 space-y-6">
                  {[
                    { label: typeLabels.lesson, items: lessons, type: "lesson" as const },
                    { label: typeLabels.practice, items: practices, type: "practice" as const },
                    { label: typeLabels.tip, items: tips, type: "tip" as const },
                  ]
                    .filter((group) => group.items.length > 0)
                    .map((group) => {
                      const tm = typeMeta[group.type];
                      return (
                        <div key={group.type}>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${tm.color}`}>
                              <tm.icon className="h-3.5 w-3.5" />
                              {group.label}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">({group.items.length})</span>
                          </div>
                          <div className="mt-3 grid gap-4 lg:grid-cols-2">
                            {group.items.map((material) => (
                              <article
                                key={material.id}
                                className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)]"
                              >
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                  {material.title}
                                </h3>
                                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                                  {material.content}
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
