import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { getPublicSetsOverview, getUserSetsOverview } from "@/server/services/sets-overview";

export const metadata: Metadata = {
  title: "Флешкарта кітапханасы",
  description: "Платформадағы барлық ашық флешкарта жинақтарын қараңыз. IELTS, тіл үйрену, пән бойынша жинақтар.",
  alternates: { canonical: "/flashcards" },
  openGraph: {
    title: "Флешкарта кітапханасы — StudyWithRaissov",
    description: "Платформадағы барлық ашық флешкарта жинақтарын қараңыз.",
    url: "/flashcards",
    locale: "kk_KZ",
  },
  robots: { index: true, follow: true },
};

const COVER_GRADIENTS = [
  "linear-gradient(135deg,#C2500A,#8F3A05)",
  "linear-gradient(135deg,#2563eb,#1B47B8)",
  "linear-gradient(135deg,#3F7D3F,#2E5F2E)",
  "linear-gradient(135deg,#E9B949,#B8801A)",
  "linear-gradient(135deg,#1B1714,#3D342C)",
  "linear-gradient(135deg,#C2425C,#8F2F45)",
];

interface FlashcardsPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
  }>;
}

export default async function FlashcardsPage({ searchParams }: FlashcardsPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { tab = user ? "my" : "library", q = "" } = await searchParams;

  const showMy = tab === "my" && Boolean(user);
  const sets = showMy ? await getUserSetsOverview() : await getPublicSetsOverview();
  const query = q.trim().toLowerCase();

  const filtered = query
    ? sets.filter((s) => s.title.toLowerCase().includes(query) || (s.description ?? "").toLowerCase().includes(query))
    : sets;

  const totalCards = filtered.reduce((sum, s) => sum + s.cardCount, 0);

  return (
    <div className="page-shell py-6 sm:py-10 lg:py-14">
      {/* Page head */}
      <div className="nd-page-head nd-reveal nd-d1">
        <div>
          <p className="nd-eyebrow">Флэшкарта жинақтары</p>
          <h1 className="nd-page-title" style={{ marginTop: 10 }}>Менің колодаларым</h1>
          <p className="nd-page-sub">
            {filtered.length} жинақ · {totalCards} карта
          </p>
        </div>
        <Link href="/sets/new" className="nd-btn-primary" style={{ flexShrink: 0 }}>
          + Жаңа жинақ
        </Link>
      </div>

      {/* Filters row */}
      <div className="nd-reveal nd-d2" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        {/* Tab pills */}
        <div className="nd-lib-filters" style={{ marginBottom: 0 }}>
          {user && (
            <Link
              href="/flashcards?tab=my"
              className={`nd-lib-pill${showMy ? " on" : ""}`}
            >
              {t("flashcards.myCollections")}
            </Link>
          )}
          <Link
            href="/flashcards?tab=library"
            className={`nd-lib-pill${!showMy ? " on" : ""}`}
          >
            {t("flashcards.publicLibrary")}
          </Link>
        </div>

        {/* Search */}
        <form style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid var(--line)", borderRadius: 99, padding: "7px 16px" }}>
          <Search style={{ width: 15, height: 15, color: "var(--ink-mute)", flexShrink: 0 }} />
          <input type="hidden" name="tab" value={tab} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("sets.searchPlaceholder")}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--ink)", width: 200 }}
          />
        </form>
      </div>

      {/* Deck grid */}
      {filtered.length > 0 ? (
        <div className="nd-deck-grid nd-reveal nd-d3">
          {filtered.map((set, i) => {
            const gradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
            const coverWord = set.title.split(/\s+/)[0] ?? set.title;
            const accuracy = set.accuracy ?? 0;

            return (
              <div key={set.id} className="nd-deck-card">
                {/* Cover */}
                <div
                  className="nd-deck-cover"
                  style={{ background: gradient }}
                >
                  {coverWord}
                </div>

                {/* Tag */}
                <span className="nd-tag nd-tag-terra" style={{ alignSelf: "flex-start" }}>
                  флэшкарта
                </span>

                {/* Title */}
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.35 }}>
                  {set.title}
                </h4>

                {/* Progress bar */}
                <div>
                  <div className="nd-deck-bar">
                    <div
                      className="nd-deck-bar-fill"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="nd-deck-meta">
                  <span>{set.cardCount} карта</span>
                  <span>{accuracy}%</span>
                </div>

                {/* CTA */}
                <Link
                  href={`/sets/${set.id}/study`}
                  className="nd-btn-soft"
                  style={{ marginTop: 4 }}
                >
                  Оқуды бастау →
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="nd-reveal nd-d3"
          style={{
            border: "1.5px dashed var(--line-strong)",
            borderRadius: 18,
            padding: "64px 24px",
            textAlign: "center",
            background: "var(--paper-2)",
          }}
        >
          <p style={{ fontSize: 15, color: "var(--ink-mute)", marginBottom: 16 }}>
            {t("sets.emptyTitle")}
          </p>
          <Link href="/sets/new" className="nd-btn-primary">
            + Жаңа жинақ жасау
          </Link>
        </div>
      )}
    </div>
  );
}
