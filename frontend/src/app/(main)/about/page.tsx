import type { Metadata } from "next";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("about.heading"),
    description: "StudyWithRaissov — Қазақстандық студенттер үшін IELTS-ті қол жетімді ету. Миссиямыз, командамыз және тарихымыз.",
    alternates: { canonical: "/about" },
    openGraph: {
      title: `${t("about.heading")} — StudyWithRaissov`,
      description: t("about.missionTag"),
      url: "/about",
    },
  };
}

type TeamMember = {
  initial: string;
  name: string;
  roleKey: string;
  avatarBg: string;
};

const TEAM: TeamMember[] = [
  {
    initial: "Ж",
    name: "Жанар Раиссов",
    roleKey: "about.roleFounder",
    avatarBg: "linear-gradient(135deg,#C2500A,#8F3A05)",
  },
  {
    initial: "Ә",
    name: "Әбдімүтәлі Бекназар",
    roleKey: "about.roleCTO",
    avatarBg: "linear-gradient(135deg,#2563eb,#1B47B8)",
  },
  {
    initial: "Д",
    name: "Дина Қанатова",
    roleKey: "about.roleContent",
    avatarBg: "linear-gradient(135deg,#3F7D3F,#2E5F2E)",
  },
];

type StatKey = { value: string; labelKey: string };

const STATS: StatKey[] = [
  { value: "12K+", labelKey: "about.statStudents" },
  { value: "7.4",  labelKey: "about.statAvgScore" },
  { value: "92%",  labelKey: "about.statGoalReached" },
  { value: "4.9",  labelKey: "about.statAppStore" },
];

export default async function AboutPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3 style={{ flex: 1 }}>{t("about.heading")}</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {t("about.missionTag")}
          </span>
        </div>
      </div>

      {/* HERO card */}
      <div
        style={{
          background: "var(--ink)",
          color: "#fff",
          padding: 48,
          borderRadius: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: 16,
          }}
        >
          {t("about.founded")}
        </div>
        <h1
          style={{
            fontSize: "clamp(22px, 4vw, 34px)",
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 16px",
            lineHeight: 1.3,
            maxWidth: 620,
          }}
        >
          {t("about.heroTitle")}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.65)",
            margin: 0,
            lineHeight: 1.65,
            maxWidth: 540,
          }}
        >
          {t("about.heroDesc")}
        </p>
      </div>

      {/* STATS row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
        className="sm:grid-cols-4"
      >
        {STATS.map((stat) => (
          <div
            key={stat.labelKey}
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "20px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "clamp(24px, 5vw, 32px)",
                fontWeight: 800,
                color: "var(--terra)",
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                fontWeight: 600,
              }}
            >
              {t(stat.labelKey)}
            </div>
          </div>
        ))}
      </div>

      {/* TEAM section */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          {t("about.teamLabel")}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {TEAM.map((member) => (
            <div
              key={member.name}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 16,
                padding: "24px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: member.avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#fff",
                  margin: "0 auto 14px",
                }}
              >
                {member.initial}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {member.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {t(member.roleKey)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MISSION card */}
      <div
        style={{
          marginTop: 24,
          background: "var(--paper-2)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          {t("about.missionLabel")}
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "0 0 14px",
          }}
        >
          {t("about.missionTitle")}
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--ink-soft)",
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          {t("about.missionDesc")}
        </p>
      </div>
    </div>
  );
}
