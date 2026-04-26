import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getPlacement, getMap } from "@/features/learn/api";
import Link from "next/link";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return { title: t("learn.metaTitle") };
}

const GRADIENTS = [
  "linear-gradient(135deg,#C2500A,#8F3A05)",
  "linear-gradient(135deg,#2563eb,#1B47B8)",
  "linear-gradient(135deg,#3F7D3F,#2E5F2E)",
  "linear-gradient(135deg,#E9B949,#B8801A)",
  "linear-gradient(135deg,#C2425C,#8F2F45)",
  "linear-gradient(135deg,#1B1714,#3D342C)",
];

const SKILLS = ["Барлығы", "Writing", "Reading", "Listening", "Speaking", "Grammar"] as const;
type Skill = (typeof SKILLS)[number];

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const placement = await getPlacement();
  if (!placement) redirect("/learn/placement");

  const params = await searchParams;
  const activeSkill: Skill =
    (SKILLS as readonly string[]).includes(params.skill ?? "")
      ? (params.skill as Skill)
      : "Барлығы";

  const mapData = await getMap();
  const allUnits = mapData.units ?? [];

  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const units =
    activeSkill === "Барлығы"
      ? allUnits
      : allUnits.filter(
          (u) => u.ieltsSkill?.toLowerCase() === activeSkill.toLowerCase()
        );

  return (
    <div className="page-shell py-8">

      {/* Page heading */}
      <div className="nd-reveal" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: 0 }}>
          {t("learn.heading")}
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
          {t("learn.subtitle")}
        </p>
      </div>

      {/* Filter pills */}
      <div className="nd-lib-filters nd-reveal nd-d1">
        {SKILLS.map((skill) => (
          <Link
            key={skill}
            href={skill === "Барлығы" ? "/learn" : `/learn?skill=${skill}`}
            className={`nd-lib-pill${activeSkill === skill ? " on" : ""}`}
          >
            {skill === "Барлығы" ? t("common.all") : skill}
          </Link>
        ))}
      </div>

      {/* Card grid */}
      {units.length === 0 ? (
        <div
          className="nd-reveal nd-d2"
          style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-mute)" }}
        >
          {t("learn.noSections")}{" "}
          <Link href="/learn" style={{ color: "var(--terra)", fontWeight: 600 }}>
            {t("learn.viewAll")}
          </Link>
        </div>
      ) : (
        <div className="nd-lib-grid">
          {units.map((unit, i) => {
            const gradient = GRADIENTS[i % GRADIENTS.length];
            const lessonCount = unit.lessons?.length ?? 0;

            return (
              <Link
                key={unit.id}
                href={`/learn/map?level=${unit.level}`}
                className="nd-lib-card nd-reveal"
                style={{
                  textDecoration: "none",
                  animationDelay: `${(i % 6) * 0.05}s`,
                }}
              >
                {/* Cover */}
                <div className="nd-lib-cover" style={{ background: gradient }}>
                  {unit.iconEmoji ?? "📖"}
                </div>

                {/* Body */}
                <div className="nd-lib-body">
                  <span
                    className="nd-tag nd-tag-terra"
                    style={{ alignSelf: "flex-start" }}
                  >
                    {unit.ieltsSkill || unit.level}
                  </span>
                  <h4>{unit.title}</h4>
                  <p>{unit.description}</p>
                </div>

                {/* Footer */}
                <div className="nd-lib-foot">
                  <span>{lessonCount} {t("learn.lesson")}</span>
                  <span>{unit.level}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
