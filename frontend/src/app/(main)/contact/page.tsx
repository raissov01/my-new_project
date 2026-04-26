import type { Metadata } from "next";
import Link from "next/link";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { ContactForm } from "./client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("contact.heading"),
    description: "StudyWithRaissov командасымен байланысыңыз. Сұрақ жіберіңіз немесе Telegram арқылы хабарласыңыз.",
    alternates: { canonical: "/contact" },
    openGraph: {
      title: `${t("contact.heading")} — StudyWithRaissov`,
      description: t("contact.formDesc"),
      url: "/contact",
    },
  };
}

export default async function ContactPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/student/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            {t("contact.back")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("contact.heading")}</h3>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 20,
          alignItems: "start",
        }}
        className="sm:grid-cols-[1.1fr_0.9fr]"
      >
        {/* LEFT — Contact form */}
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "28px 24px",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              {t("contact.formLabel")}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              {t("contact.formTitle")}
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 6, marginBottom: 0 }}>
              {t("contact.formDesc")}
            </p>
          </div>
          <ContactForm locale={locale} />
        </div>

        {/* RIGHT — Contact info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* EMAIL */}
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "20px 20px",
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
                marginBottom: 8,
              }}
            >
              {t("contact.emailLabel")}
            </div>
            <a
              href="mailto:hello@studywithraissov.kz"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--terra)",
                textDecoration: "none",
              }}
            >
              hello@studywithraissov.kz
            </a>
          </div>

          {/* TELEGRAM */}
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "20px 20px",
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
                marginBottom: 8,
              }}
            >
              {t("contact.telegramLabel")}
            </div>
            <a
              href="https://t.me/studywithraissov"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--terra)",
                textDecoration: "none",
              }}
            >
              @studywithraissov
            </a>
          </div>

          {/* ADDRESS */}
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "20px 20px",
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
                marginBottom: 8,
              }}
            >
              {t("contact.addressLabel")}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              {t("contact.addressValue")}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "4px 0 0",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {t("contact.hours")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
