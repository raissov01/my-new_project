import { getCurrentUser } from "@/server/auth";
import { getScenarios, getConversationHistory } from "@/features/tutor/api";
import Link from "next/link";
import { Plus, Send } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export const metadata = { title: "AI Tutor — StudyWithRaissov" };


const GRADIENTS = [
  "linear-gradient(135deg,#C2500A,#8F3A05)",
  "linear-gradient(135deg,#2563eb,#1B47B8)",
  "linear-gradient(135deg,#3F7D3F,#2E5F2E)",
  "linear-gradient(135deg,#E9B949,#B8801A)",
  "linear-gradient(135deg,#C2425C,#8F2F45)",
  "linear-gradient(135deg,#1B1714,#3D342C)",
];

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const MODES = [
    { key: "work",     label: "Writing"  },
    { key: "social",   label: "Speaking" },
    { key: "academic", label: "Grammar"  },
    { key: "daily",    label: t("tutor.modeTranslate") },
  ];

  await getCurrentUser();
  const params = await searchParams;

  const activeCategory = params.category ?? "";

  const [scenarios, history] = await Promise.all([
    getScenarios({ category: activeCategory || undefined }),
    getConversationHistory(),
  ]);

  return (
    <div className="page-shell py-6">
      <div className="nd-ai-layout" style={{ minHeight: "calc(100vh - 130px)" }}>

        {/* ── Left sidebar ── */}
        <aside className="nd-ai-side">
          <Link
            href="/tutor"
            className="flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-3 py-2.5 text-[13px] font-700 text-white hover:opacity-90 transition-opacity"
            style={{ fontWeight: 700 }}
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            {t("tutor.newConversation")}
          </Link>

          {history.length > 0 && (
            <>
              <h4>{t("tutor.history")}</h4>
              {history.slice(0, 20).map((entry) => {
                const date = new Date(entry.startedAt).toLocaleDateString("kk-KZ", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <Link
                    key={entry.id}
                    href={`/tutor/${entry.scenario.slug}`}
                    className={`nd-ai-history${entry.status === "active" ? " on" : ""}`}
                  >
                    {entry.scenario.title}
                    <small>{date} · {entry.scenario.level}</small>
                  </Link>
                );
              })}
            </>
          )}

          {history.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", padding: "8px 10px" }}>
              {t("tutor.noConversations")}
            </p>
          )}
        </aside>

        {/* ── Main panel ── */}
        <main className="nd-ai-main">

          {/* Modes bar */}
          <nav className="nd-ai-modes">
            <Link
              href="/tutor"
              className={`nd-ai-mode${!activeCategory ? " on" : ""}`}
            >
              {t("common.all")}
            </Link>
            {MODES.map(({ key, label }) => (
              <Link
                key={key}
                href={`/tutor?category=${key}`}
                className={`nd-ai-mode${activeCategory === key ? " on" : ""}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Thread — scenario cards as messages */}
          <div className="nd-ai-thread">
            {/* Intro AI message */}
            <div className="nd-ai-msg">
              <div className="nd-ai-ava nd-ai-ava-ai">AI</div>
              <div className="nd-ai-bubble">
                {t("tutor.greeting")}
              </div>
            </div>

            {/* Scenario grid inside thread */}
            {scenarios.length === 0 ? (
              <div className="nd-ai-msg">
                <div className="nd-ai-ava nd-ai-ava-ai">AI</div>
                <div className="nd-ai-bubble" style={{ color: "var(--ink-mute)" }}>
                  {t("tutor.noScenarios")}{" "}
                  <Link href="/tutor" style={{ color: "var(--terra)" }}>
                    {t("common.viewAll")}
                  </Link>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))",
                  gap: 14,
                  maxWidth: "100%",
                }}
              >
                {scenarios.map((sc, i) => (
                  <Link
                    key={sc.id}
                    href={`/tutor/${sc.slug}`}
                    className="nd-reveal"
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 14,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform .15s, border-color .15s",
                        cursor: "pointer",
                      }}
                      className="nd-lib-card"
                    >
                      {/* Cover */}
                      <div
                        className="nd-lib-cover"
                        style={{
                          background: GRADIENTS[i % GRADIENTS.length],
                          fontSize: 32,
                        }}
                      >
                        {sc.icon ?? "💬"}
                      </div>

                      {/* Body */}
                      <div className="nd-lib-body">
                        <span className="nd-tag nd-tag-terra" style={{ alignSelf: "flex-start" }}>
                          {sc.category}
                        </span>
                        <h4>{sc.title}</h4>
                        <p>{sc.description}</p>
                      </div>

                      {/* Footer */}
                      <div className="nd-lib-foot">
                        <span>~{sc.estimatedMinutes} мин</span>
                        <span>{sc.level}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Composer — decorative, links to scenario selection */}
          <div className="nd-ai-composer">
            <div className="nd-ai-composer-box">
              <textarea
                placeholder={t("tutor.composerPlaceholder")}
                rows={1}
                disabled
                style={{ cursor: "default" }}
              />
              <Link
                href="/tutor"
                aria-label="Жіберу"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Send size={16} color="#fff" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
