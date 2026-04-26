"use client";

import { useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { getApiBaseUrl } from "@/lib/client/api";
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
    subject: "general",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const subjectLabels: Record<string, string> = {
        general: t("contact.subjectGeneral"),
        tech: t("contact.subjectTech"),
        partner: t("contact.subjectPartner"),
        other: t("contact.subjectOther"),
      };
      const res = await fetch(`${getApiBaseUrl()}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subject: subjectLabels[form.subject] ?? form.subject }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? t("contact.errorGeneric"));
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("contact.errorGeneric"));
    } finally {
      setLoading(false);
    }
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
          <option value="general">{t("contact.subjectGeneral")}</option>
          <option value="tech">{t("contact.subjectTech")}</option>
          <option value="partner">{t("contact.subjectPartner")}</option>
          <option value="other">{t("contact.subjectOther")}</option>
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
      {error && (
        <p style={{ color: "var(--terra)", fontSize: 13, margin: 0 }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: 12,
          border: "none",
          background: "var(--terra)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: ".02em",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? t("common.loading") : t("contact.submit")}
      </button>
    </form>
  );
}
