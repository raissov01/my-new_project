import Link from "next/link";
import { ArrowLeft, BookOpen, BookOpenText, ClipboardCheck, Download, Headphones, Lightbulb, MessageSquare, Mic, PenLine, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { isAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/shared/auth/admin";
import { getMaterials, type IELTSMaterial } from "@/app/(main)/ielts/admin/actions";

/* ─── Section top-level groups (user's 4 categories) ─── */

type TopGroup = {
  key: string;
  label: string;
  icon: typeof BookOpenText;
  tone: string;
  types: string[];
};

const categoryMeta = {
  reading: { icon: BookOpen, tone: "from-blue-500/18 to-indigo-500/10" },
  listening: { icon: Headphones, tone: "from-cyan-500/18 to-sky-500/10" },
  writing: { icon: PenLine, tone: "from-emerald-500/18 to-teal-500/10" },
  speaking: { icon: Mic, tone: "from-violet-500/18 to-fuchsia-500/10" },
  vocabulary: { icon: BookOpen, tone: "from-orange-500/18 to-amber-500/10" },
  grammar: { icon: BookOpen, tone: "from-rose-500/18 to-pink-500/10" },
  general: { icon: BookOpen, tone: "from-slate-500/18 to-zinc-500/10" },
} as const;

const categoryOrder = ["writing", "speaking", "reading", "listening", "vocabulary", "grammar", "general"] as const;

export default async function IELTSMaterialsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const cookieStore = await cookies();
  const isAdmin = isAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME));
  const allMaterials = await getMaterials();
  // Use relative URL for PDF links — browser accesses via nginx proxy, not internal backend URL
  const filesBaseUrl = "";

  /* ─── Split into 4 top-level groups ─── */
  const materials = allMaterials.filter((m) => ["book", "lesson", "practice"].includes(m.type));
  const tips = allMaterials.filter((m) => m.type === "tip");
  const mockTests = allMaterials.filter((m) => m.type === "mock_test");
  const feedbackPrompts = allMaterials.filter((m) => m.type === "feedback_prompt");

  const topGroups: TopGroup[] = [
    { key: "materials", label: t("ielts.matGroupMaterials"), icon: BookOpenText, tone: "from-indigo-500/18 to-blue-500/10", types: ["book", "lesson", "practice"] },
    { key: "tips", label: t("ielts.matGroupTips"), icon: Lightbulb, tone: "from-amber-500/18 to-orange-500/10", types: ["tip"] },
    { key: "mock_tests", label: t("ielts.matGroupMockTests"), icon: ClipboardCheck, tone: "from-emerald-500/18 to-teal-500/10", types: ["mock_test"] },
    { key: "feedback_prompts", label: t("ielts.matGroupFeedback"), icon: MessageSquare, tone: "from-violet-500/18 to-fuchsia-500/10", types: ["feedback_prompt"] },
  ];

  const groupedItems: Record<string, IELTSMaterial[]> = {
    materials,
    tips,
    mock_tests: mockTests,
    feedback_prompts: feedbackPrompts,
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

        {/* ─── Quick stats ─── */}
        <div className="mt-5 flex flex-wrap gap-3">
          {topGroups.map((g) => {
            const count = groupedItems[g.key]?.length ?? 0;
            if (count === 0) return null;
            const Icon = g.icon;
            return (
              <a key={g.key} href={`#${g.key}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                <Icon className="h-3.5 w-3.5" />
                {g.label}
                <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">{count}</span>
              </a>
            );
          })}
        </div>
      </div>

      {allMaterials.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-16 text-center">
          <BookOpenText className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("admin.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("admin.emptyPublicBody")}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {topGroups.map((group) => {
            const items = groupedItems[group.key] ?? [];
            if (items.length === 0) return null;

            const GroupIcon = group.icon;

            // Sub-group by category
            const byCategory = new Map<string, IELTSMaterial[]>();
            for (const cat of categoryOrder) {
              const catItems = items.filter((m) => m.category === cat);
              if (catItems.length > 0) byCategory.set(cat, catItems);
            }

            return (
              <section key={group.key} id={group.key}>
                {/* ─── Group header ─── */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br ${group.tone}`}>
                    <GroupIcon className="h-5 w-5 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                      {group.label}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">{items.length} items</p>
                  </div>
                </div>

                {/* ─── Category sub-sections ─── */}
                <div className="mt-5 space-y-6">
                  {Array.from(byCategory.entries()).map(([cat, catItems]) => {
                    const meta = categoryMeta[cat as keyof typeof categoryMeta];
                    const CatIcon = meta?.icon ?? BookOpen;
                    const catLabel = t(`ielts.matCat_${cat}`);

                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                            <CatIcon className="h-3.5 w-3.5" />
                            {catLabel}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">({catItems.length})</span>
                        </div>
                        <div className="mt-3 grid gap-4 lg:grid-cols-2">
                          {catItems.map((material) => (
                            <article
                              key={material.id}
                              className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                                  {material.title}
                                </h3>
                                {material.difficulty && material.difficulty !== "all" && (
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    material.difficulty === "beginner" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                                    material.difficulty === "intermediate" ? "text-blue-500 bg-blue-500/10 border-blue-500/20" :
                                    "text-orange-500 bg-orange-500/10 border-orange-500/20"
                                  }`}>
                                    {material.difficulty}
                                  </span>
                                )}
                              </div>
                              {material.description && (
                                <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
                                  {material.description}
                                </p>
                              )}
                              {material.filePath && (
                                <div className="mt-3 flex items-center gap-2">
                                  <Link
                                    href={`/ielts/materials/${material.id}`}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-4 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/15 active:scale-95"
                                  >
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Read
                                  </Link>
                                  <a
                                    href={`${filesBaseUrl}/api/v1/files/${encodeURI(material.filePath)}?download=1`}
                                    download
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-95"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </a>
                                </div>
                              )}
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
