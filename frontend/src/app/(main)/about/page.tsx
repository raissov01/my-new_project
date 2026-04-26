import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Біз туралы",
  description: "StudyWithRaissov — Қазақстандық студенттер үшін IELTS-ті қол жетімді ету. Миссиямыз, командамыз және тарихымыз.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Біз туралы — StudyWithRaissov",
    description: "Раиссовтың миссиясы және командасы.",
    url: "/about",
    locale: "kk_KZ",
  },
};

type TeamMember = {
  initial: string;
  name: string;
  role: string;
  avatarBg: string;
};

const TEAM: TeamMember[] = [
  {
    initial: "Ә",
    name: "Әбдімүтәлі Бекназар",
    role: "ТЕХ. ДИРЕКТОР · AI",
    avatarBg: "linear-gradient(135deg,#2563eb,#1B47B8)",
  },
];

type Stat = {
  value: string;
  label: string;
};

const STATS: Stat[] = [
  { value: "12K+", label: "СТУДЕНТ" },
  { value: "7.4", label: "ОРТА БАҒ" },
  { value: "92%", label: "МАҚСАТҚА ЖЕТТІ" },
  { value: "4.9", label: "APP STORE" },
];

export default function AboutPage() {
  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3 style={{ flex: 1 }}>Біз туралы</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            Раиссовтың миссиясы
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
          — ҚҰРЫЛҒАН: 2023
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
          Қазақстандық студенттер үшін IELTS-ті қол жетімді ету.
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
          Біз 2023 жылы бастадық. Бүгін 12,000+ студент бізбен бірге дайындалуда.
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
            key={stat.label}
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
              {stat.label}
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
          КОМАНДА
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
                {member.role}
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
          МИССИЯ
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "0 0 14px",
          }}
        >
          Біздің миссия
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--ink-soft)",
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          StudyWithRaissov — тек дайындық сайты емес. Бұл Қазақстандағы IELTS мүмкіндіктеріне тең
          қол жеткізу жолындағы қозғалыс. Біз жасанды интеллект, адаптивті оқу және нақты
          нәтижелерге бағытталған технологияны бірге қолданамыз.
        </p>
      </div>
    </div>
  );
}
