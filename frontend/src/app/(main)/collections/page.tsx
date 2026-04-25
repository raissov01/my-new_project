import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LibraryBig, Plus } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/features/sets/components";
import { getUserSetsOverview } from "@/server/services/sets-overview";

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const sets = await getUserSetsOverview();

  const recentSets = sets.slice(0, 6);
  const reviewCount = sets.filter(
    (set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0
  ).length;
  const studiedCount = sets.filter((set) => Boolean(set.lastStudiedAt)).length;

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("collections.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("nav.myCollections")}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link href="/sets">
              <Button className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
                <LibraryBig className="h-4 w-4" />
                {t("nav.flashcardLibrary")}
              </Button>
            </Link>
            <Link href="/sets/new">
              <Button className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
                <Plus className="h-4 w-4" />
                {t("dashboard.createNewSet")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="nd-kpi-grid" style={{ marginBottom: 24 }}>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("collections.totalCollections")}</span>
          <strong className="nd-kpi-val">{sets.length}</strong>
          <span className="nd-kpi-sub">sets</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("collections.needsReview")}</span>
          <strong className="nd-kpi-val">{reviewCount}</strong>
          <span className="nd-kpi-sub">due</span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("collections.startedCollections")}</span>
          <strong className="nd-kpi-val">{studiedCount}</strong>
          <span className="nd-kpi-sub">started</span>
        </div>
      </div>

      {/* Recent sets section */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
              {t("collections.recentTitle")}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.6 }}>
              {t("collections.recentSubtitle")}
            </p>
          </div>
          <Link href="/sets" style={{ display: "inline-flex" }}>
            <Button variant="outline">
              {t("collections.openLibrary")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {recentSets.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {recentSets.map((set) => (
              <SetCard
                key={set.id}
                id={set.id}
                title={set.title}
                description={set.description}
                cardCount={set.cardCount}
                createdAt={set.createdAt}
                lastStudiedAt={set.lastStudiedAt}
                accuracy={set.accuracy}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div style={{ border: "1px dashed var(--line)", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
              {t("collections.emptyTitle")}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>
              {t("collections.emptyBody")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
