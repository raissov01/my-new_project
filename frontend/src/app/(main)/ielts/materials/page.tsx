import Link from "next/link";
import { ArrowLeft, BookOpen, BookOpenText, ClipboardCheck, Download, Headphones, Lightbulb, MessageSquare, Mic, PenLine, Settings } from "lucide-react";
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
  reading: { icon: BookOpen },
  listening: { icon: Headphones },
  writing: { icon: PenLine },
  speaking: { icon: Mic },
  vocabulary: { icon: BookOpen },
  grammar: { icon: BookOpen },
  general: { icon: BookOpen },
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
    { key: "materials", label: t("ielts.matGroupMaterials"), icon: BookOpenText, tone: "", types: ["book", "lesson", "practice"] },
    { key: "tips", label: t("ielts.matGroupTips"), icon: Lightbulb, tone: "", types: ["tip"] },
    { key: "mock_tests", label: t("ielts.matGroupMockTests"), icon: ClipboardCheck, tone: "", types: ["mock_test"] },
    { key: "feedback_prompts", label: t("ielts.matGroupFeedback"), icon: MessageSquare, tone: "", types: ["feedback_prompt"] },
  ];

  const groupedItems: Record<string, IELTSMaterial[]> = {
    materials,
    tips,
    mock_tests: mockTests,
    feedback_prompts: feedbackPrompts,
  };

  const monoStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace" };

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* ─── nd-mock-shell header ─── */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft">
            <ArrowLeft style={{ width: 14, height: 14 }} />
            {t("ielts.backToHub")}
          </Link>
          <h3>{t("ielts.materialsTitle")}</h3>
          <span style={monoStyle}>{allMaterials.length} materials</span>
          {isAdmin && (
            <Link href="/ielts/admin" className="nd-btn-soft" style={{ marginLeft: "auto" }}>
              <Settings style={{ width: 14, height: 14 }} />
              {t("admin.manageBtn")}
            </Link>
          )}
        </div>
      </div>

      {/* ─── Category pill nav ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
        {topGroups.map((g) => {
          const count = groupedItems[g.key]?.length ?? 0;
          if (count === 0) return null;
          const Icon = g.icon;
          return (
            <a
              key={g.key}
              href={`#${g.key}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 99,
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--ink-mute)",
                textDecoration: "none",
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {g.label}
              <span style={{ ...monoStyle, fontSize: 10, fontWeight: 700, opacity: 0.7 }}>{count}</span>
            </a>
          );
        })}
      </div>

      {allMaterials.length === 0 ? (
        <div
          style={{
            background: "var(--paper)",
            border: "1px dashed var(--line)",
            borderRadius: 18,
            padding: "64px 24px",
            textAlign: "center",
          }}
        >
          <BookOpenText style={{ width: 32, height: 32, color: "var(--ink-mute)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{t("admin.emptyTitle")}</h2>
          <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>{t("admin.emptyPublicBody")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "var(--paper-2)",
                      border: "1px solid var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <GroupIcon style={{ width: 18, height: 18, color: "var(--ink)" }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{group.label}</h2>
                    <p style={{ ...monoStyle, fontSize: 11, color: "var(--ink-mute)", margin: 0 }}>{items.length} items</p>
                  </div>
                </div>

                {/* ─── Category sub-sections ─── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {Array.from(byCategory.entries()).map(([cat, catItems]) => {
                    const meta = categoryMeta[cat as keyof typeof categoryMeta];
                    const CatIcon = meta?.icon ?? BookOpen;
                    const catLabel = t(`ielts.matCat_${cat}`);

                    return (
                      <div key={cat}>
                        {/* Category pill */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 12px",
                              borderRadius: 99,
                              background: "var(--paper-2)",
                              border: "1px solid var(--line)",
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--ink-mute)",
                            }}
                          >
                            <CatIcon style={{ width: 13, height: 13 }} />
                            {catLabel}
                          </span>
                          <span style={{ ...monoStyle, fontSize: 11, color: "var(--ink-mute)" }}>({catItems.length})</span>
                        </div>

                        {/* 2-col item card grid */}
                        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
                          {catItems.map((material) => (
                            <article
                              key={material.id}
                              style={{
                                background: "var(--paper-2)",
                                border: "1px solid var(--line)",
                                borderRadius: 14,
                                padding: "14px 18px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                                  {material.title}
                                </h3>
                                {material.difficulty && material.difficulty !== "all" && (
                                  <span
                                    style={{
                                      borderRadius: 99,
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      fontFamily: "'JetBrains Mono',monospace",
                                      flexShrink: 0,
                                      background:
                                        material.difficulty === "beginner"
                                          ? "rgba(34,197,94,0.12)"
                                          : material.difficulty === "intermediate"
                                          ? "rgba(59,130,246,0.12)"
                                          : "rgba(249,115,22,0.12)",
                                      color:
                                        material.difficulty === "beginner"
                                          ? "var(--green)"
                                          : material.difficulty === "intermediate"
                                          ? "#3b82f6"
                                          : "var(--terra)",
                                    }}
                                  >
                                    {material.difficulty}
                                  </span>
                                )}
                              </div>
                              {material.description && (
                                <p style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.6, margin: "0 0 10px" }}>
                                  {material.description}
                                </p>
                              )}
                              {material.filePath && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                                  <Link
                                    href={`/ielts/materials/${material.id}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "6px 14px",
                                      borderRadius: 99,
                                      background: "var(--paper)",
                                      border: "1px solid var(--line)",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: "var(--ink)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    <BookOpen style={{ width: 13, height: 13 }} />
                                    Read
                                  </Link>
                                  <a
                                    href={`${filesBaseUrl}/api/v1/files/${encodeURI(material.filePath)}?download=1`}
                                    download
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "6px 14px",
                                      borderRadius: 99,
                                      background: "transparent",
                                      border: "1px solid var(--line)",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: "var(--ink-mute)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    <Download style={{ width: 13, height: 13 }} />
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
