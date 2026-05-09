import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { getPlacement, getIELTSMap, getProgress } from "@/features/learn/api";
import { Lock, Star, Trophy } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export const metadata: Metadata = {
  title: "IELTS Roadmap | StudyWithRaissov",
  description: "IELTS Reading Strategies, Writing Tasks, Listening Sections and Speaking Parts.",
};

export default async function IELTSRoadmapPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [mapData, progress, placement, locale] = await Promise.all([
    getIELTSMap(),
    getProgress(),
    getPlacement(),
    getServerLocale(),
  ]);
  const t = createTranslator(locale);

  const units = mapData.units;
  const userLevel = placement?.level ?? "A1";
  const lessonsDone = progress?.lessonsCompleted ?? 0;

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header bar */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft">
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.roadmap.title")}</h3>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            {t("ielts.roadmap.levelLabel")}: {userLevel}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            {t("ielts.roadmap.lessonsDone").replace("{n}", String(lessonsDone))}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {units.length === 0 && (
        <div
          style={{
            background: "var(--paper)",
            border: "1px dashed var(--line)",
            borderRadius: 18,
            padding: "48px 24px",
            textAlign: "center",
            marginBottom: 18,
          }}
        >
          <p style={{ fontSize: 14, color: "var(--ink-mute)" }}>{t("ielts.roadmap.loadingUnits")}</p>
        </div>
      )}

      {/* Units */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {units.map((unit) => {
          const starsPercent = unit.maxStars > 0 ? Math.round((unit.totalStars / unit.maxStars) * 100) : 0;
          const isComplete = unit.totalStars > 0 && unit.totalStars >= unit.maxStars;

          const iconMap: Record<string, string> = {
            vocabulary: "🔤",
            grammar: "📝",
            reading: "📖",
            listening: "🎧",
            speaking: "🎤",
            writing: "✍️",
          };

          return (
            <div
              key={unit.id}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 18,
                padding: "20px 24px",
                opacity: unit.isUnlocked ? 1 : 0.5,
              }}
            >
              {/* Unit header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* Emoji / lock icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: isComplete ? "rgba(250,204,21,0.12)" : "var(--paper-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {unit.isUnlocked
                    ? (iconMap[unit.ieltsSkill] ?? unit.iconEmoji)
                    : <Lock size={20} color="var(--ink-mute)" />
                  }
                </div>

                {/* Title + level + progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                      {unit.title}
                    </h3>
                    <span
                      style={{
                        background: "var(--paper-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--ink-mute)",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {unit.level}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4, marginBottom: 0 }}>
                    {unit.description}
                  </p>

                  {unit.isUnlocked && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Stars */}
                      <div style={{ display: "flex", gap: 2 }}>
                        {[33, 66, 100].map((threshold) => (
                          <Star
                            key={threshold}
                            size={14}
                            fill={starsPercent >= threshold ? "var(--yellow)" : "none"}
                            color={starsPercent >= threshold ? "var(--yellow)" : "var(--ink-mute)"}
                            style={{ opacity: starsPercent >= threshold ? 1 : 0.35 }}
                          />
                        ))}
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 6, borderRadius: 3, background: "var(--line)", flex: 1 }}>
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            background: "var(--terra)",
                            width: starsPercent + "%",
                            transition: "width .3s",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>
                        {unit.lessons?.filter((l: { isCompleted: boolean }) => l.isCompleted).length ?? 0}/{unit.lessons?.length ?? 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesson list */}
              {unit.isUnlocked && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  {(unit.lessons ?? []).map((lesson: {
                    id: string | number;
                    lessonType: string;
                    title: string;
                    isCompleted: boolean;
                    bestStars?: number;
                  }, li: number) => {
                    const isBoss = lesson.lessonType === "boss";
                    const prevCompleted = li === 0 || (unit.lessons[li - 1]?.bestStars ?? 0) > 0;

                    return (
                      <div
                        key={lesson.id}
                        style={{
                          background: "var(--paper-2)",
                          border: "1px solid var(--line)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        {/* Lesson number / boss badge */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            background: lesson.isCompleted
                              ? "rgba(34,197,94,0.12)"
                              : isBoss
                                ? "rgba(245,158,11,0.12)"
                                : "var(--line)",
                            color: lesson.isCompleted
                              ? "#16a34a"
                              : isBoss
                                ? "#d97706"
                                : "var(--ink-mute)",
                          }}
                        >
                          {isBoss ? <Trophy size={15} /> : li + 1}
                        </div>

                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--ink)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lesson.title}
                        </span>

                        {prevCompleted ? (
                          <Link
                            href={`/learn/lessons/${lesson.id}`}
                            style={{
                              background: "var(--terra)",
                              color: "#fff",
                              borderRadius: 8,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              textDecoration: "none",
                              flexShrink: 0,
                            }}
                          >
                            {lesson.isCompleted ? "Retry" : "Play"}
                          </Link>
                        ) : (
                          <Lock size={15} color="var(--ink-mute)" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          padding: "20px 24px",
          marginTop: 18,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 12 }}>
          Looking for General English practice?
        </p>
        <Link
          href="/learn/map"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--terra)",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Go to General English →
        </Link>
      </div>
    </div>
  );
}
