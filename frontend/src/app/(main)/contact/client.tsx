"use client";

import { useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/shared/i18n";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function ContactForm({ locale: _locale }: { locale: Locale }) {
  const { t } = useLocale();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: t("contact.subjectGeneral"),
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        style={{
          padding: "32px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--terra-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 8,
          }}
        >
          ✓
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
          {t("contact.successTitle")}
        </h3>
        <p style={{ fontSize: 14, color: "var(--ink-mute)", margin: 0, lineHeight: 1.6 }}>
          {t("contact.successDesc")}
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: "", email: "", subject: t("contact.subjectGeneral"), message: "" });
          }}
          className="nd-btn-soft"
          style={{ marginTop: 8, fontSize: 13, padding: "8px 16px" }}
        >
          {t("contact.newQuestion")}
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--paper-2)",
    color: "var(--ink)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--ink-mute)",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: ".06em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>{t("contact.labelName")}</label>
        <input
          name="name"
          type="text"
          placeholder={t("contact.placeholderName")}
          value={form.name}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>{t("contact.labelEmail")}</label>
        <input
          name="email"
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>{t("contact.labelSubject")}</label>
        <select
          name="subject"
          value={form.subject}
          onChange={handleChange}
          style={inputStyle}
        >
          <option>{t("contact.subjectGeneral")}</option>
          <option>{t("contact.subjectTech")}</option>
          <option>{t("contact.subjectPartner")}</option>
          <option>{t("contact.subjectOther")}</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>{t("contact.labelMessage")}</label>
        <textarea
          name="message"
          placeholder={t("contact.placeholderMessage")}
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: 12,
          border: "none",
          background: "var(--terra)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: ".02em",
        }}
      >
        {t("contact.submit")}
      </button>
    </form>
  );
}
