import Link from "next/link";
import { GraduationCap, Plus, Search, SlidersHorizontal, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/features/sets/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getPublicSetsOverview } from "@/server/services/sets-overview";

interface SetsPageProps {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    sort?: string;
  }>;
}

export default async function SetsPage({ searchParams }: SetsPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { q = "", filter = "all", sort = "recent" } = await searchParams;

  const sets = await getPublicSetsOverview();
  const query = q.trim().toLowerCase();

  let filtered = sets.filter((set) => {
    const matchesQuery =
      !query ||
      set.title.toLowerCase().includes(query) ||
      (set.description ?? "").toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (filter === "review" && user) {
      return set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0;
    }

    if (filter === "recent" && user) {
      return Boolean(set.lastStudiedAt);
    }

    if (filter === "mastered" && user) {
      return set.accuracy >= 80 && set.cardCount > 0;
    }

    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "accuracy") return b.accuracy - a.accuracy;
    if (sort === "cards") return b.cardCount - a.cardCount;

    const aDate = a.lastStudiedAt ?? a.updatedAt ?? a.createdAt;
    const bDate = b.lastStudiedAt ?? b.updatedAt ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const quickStartSet = user
    ? sets.find((set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0) ??
      sets[0] ??
      null
    : sets[0] ?? null;
  const quickStartHref = quickStartSet
    ? user
      ? `/sets/${quickStartSet.id}/study${
          quickStartSet.reviewCount > 0 ||
          quickStartSet.weakCount > 0 ||
          quickStartSet.dueCount > 0
            ? "?mode=review"
            : ""
        }`
      : `/sets/${quickStartSet.id}`
    : "/sets";

  const masteryCount = user
    ? sets.filter((set) => set.accuracy >= 80 && set.cardCount > 0).length
    : sets.length;
  const reviewReadyCount = user
    ? sets.filter((set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0).length
    : 0;

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("sets.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {sets.length} {sets.length === 1 ? t("dashboard.set") : t("dashboard.sets")}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("nav.flashcardLibrary")}
          </span>
        </div>
      </div>

      <div className="nd-kpi-grid" style={{ marginBottom: 24 }}>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">
            {user ? t("sets.librarySignalTotal") : t("guest.publicSets")}
          </span>
          <strong className="nd-kpi-val">{sets.length}</strong>
          <span className="nd-kpi-sub">
            {user ? t("sets.librarySignalTotalBody") : t("guest.libraryPreviewBody")}
          </span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">
            {user ? t("sets.librarySignalReview") : t("guest.visibleNow")}
          </span>
          <strong className="nd-kpi-val">{user ? reviewReadyCount : filtered.length}</strong>
          <span className="nd-kpi-sub">
            {user ? t("sets.librarySignalReviewBody") : t("guest.visibleNowBody")}
          </span>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">
            {user ? t("sets.librarySignalMastery") : t("guest.structuredDecks")}
          </span>
          <strong className="nd-kpi-val">{masteryCount}</strong>
          <span className="nd-kpi-sub">
            {user ? t("sets.librarySignalMasteryBody") : t("guest.structuredDecksBody")}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {user ? (
          <Link href="/collections">
            <Button size="lg" variant="outline">
              {t("nav.myCollections")}
            </Button>
          </Link>
        ) : (
          <AuthRequiredPrompt
            triggerLabel={t("nav.myCollections")}
            title={t("guest.authRequiredTitle")}
            description={t("guest.collectionsPrompt")}
            signupLabel={t("guest.signUpToContinue")}
            loginLabel={t("guest.logInToUnlock")}
            cancelLabel={t("set.cancel")}
            variant="outline"
          />
        )}

        <Link href={quickStartHref}>
          <Button size="lg" variant="secondary">
            <GraduationCap className="h-4 w-4" />
            {user ? t("nav.startStudy") : t("guest.previewSet")}
          </Button>
        </Link>

        {user ? (
          <Link href="/sets/new">
            <Button size="lg">
              <Plus className="h-4 w-4" />
              {t("dashboard.createNewSet")}
            </Button>
          </Link>
        ) : (
          <AuthRequiredPrompt
            triggerLabel={t("dashboard.createNewSet")}
            title={t("guest.authRequiredTitle")}
            description={t("guest.createPrompt")}
            signupLabel={t("guest.signUpToContinue")}
            loginLabel={t("guest.logInToUnlock")}
            cancelLabel={t("set.cancel")}
            icon={<Plus className="h-4 w-4" />}
          />
        )}
      </div>

      <form>
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 18,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--paper-2)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              padding: "0 12px",
              minWidth: 200,
            }}
          >
            <Search style={{ width: 16, height: 16, color: "var(--ink-mute)", flexShrink: 0 }} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("sets.searchPlaceholder")}
              style={{
                height: 44,
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "var(--paper-2)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".1em",
                color: "var(--ink-mute)",
              }}
            >
              {t("sets.filter")}
            </span>
            <select
              name="filter"
              defaultValue={filter}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              <option value="all">{t("sets.filterAll")}</option>
              <option value="review">{t("sets.filterNeedsReview")}</option>
              <option value="recent">{t("sets.filterRecent")}</option>
              <option value="mastered">{t("sets.filterMastered")}</option>
            </select>
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "var(--paper-2)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".1em",
                color: "var(--ink-mute)",
              }}
            >
              {t("sets.sort")}
            </span>
            <select
              name="sort"
              defaultValue={sort}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              <option value="recent">{t("sets.sortRecent")}</option>
              <option value="title">{t("sets.sortTitle")}</option>
              <option value="accuracy">{t("sets.sortAccuracy")}</option>
              <option value="cards">{t("sets.sortCards")}</option>
            </select>
          </label>

          <Button type="submit" variant="outline" style={{ height: 44 }}>
            <SlidersHorizontal className="h-4 w-4" />
            {t("sets.apply")}
          </Button>
        </div>
      </form>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <p style={{ fontSize: 13, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace" }}>
          {filtered.length} {filtered.length === 1 ? t("dashboard.set") : t("dashboard.sets")}
          {query ? ` — ${t("sets.searchMatched").replace("{q}", q)}` : ""}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((set) => {
            const isOwner = Boolean(user && set.userId === user.id);
            return (
              <SetCard
                key={set.id}
                id={set.id}
                title={set.title}
                description={set.description}
                cardCount={set.cardCount}
                createdAt={set.createdAt}
                lastStudiedAt={set.lastStudiedAt}
                accuracy={"accuracy" in set ? set.accuracy : 0}
                locale={locale}
                showManageActions={isOwner}
                showSaveAction={Boolean(user) && !isOwner}
                requireAuthForStudy={!user}
              />
            );
          })}
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 18,
            padding: "64px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 20px",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              border: "1px solid var(--line)",
              background: "var(--paper-2)",
              color: "var(--ink-mute)",
            }}
          >
            <Target style={{ width: 20, height: 20 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
            {t("sets.emptyTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            {t("sets.emptyBody")}
          </p>
        </div>
      )}
    </div>
  );
}
