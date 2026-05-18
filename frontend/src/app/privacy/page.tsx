import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for StudyWithRaissov — what data we collect, why, and how it is protected.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 18, 2026";

export default function PrivacyPage() {
  return (
    <div style={pageStyle}>
      <article style={articleStyle}>
        <Link href="/" style={backLinkStyle}>
          &larr; Back to home
        </Link>

        <h1 style={h1Style}>Privacy Policy</h1>
        <p style={metaStyle}>Last updated: {LAST_UPDATED}</p>

        <p>
          This Privacy Policy explains how StudyWithRaissov (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
          collects, uses, and protects your personal information when you use{" "}
          <a href="https://studywithraissov.com" style={linkStyle}>
            studywithraissov.com
          </a>{" "}
          and related services (the &ldquo;Service&rdquo;). By using the Service you agree to the
          practices described here.
        </p>

        <h2 style={h2Style}>1. Information we collect</h2>
        <p>
          <strong style={strongStyle}>Account information.</strong> When you register we collect
          your name, email address, password (stored as a hash), and any optional profile fields
          you fill in such as preferred language, target exam date, and study goals.
        </p>
        <p>
          <strong style={strongStyle}>Learning data.</strong> We collect the activity you generate
          on the Service: quiz attempts, flashcard reviews, listening sessions, written essays,
          recorded speaking responses, AI feedback received, study streaks, achievements, and
          aggregated progress metrics.
        </p>
        <p>
          <strong style={strongStyle}>Payment information.</strong> Subscription payments are
          processed by Lemon Squeezy. We do not see or store your full card number. We receive a
          subscription record (plan, status, renewal date, last four digits of the card, country)
          which we use to provision your access.
        </p>
        <p>
          <strong style={strongStyle}>Technical data.</strong> We log IP address, browser type,
          operating system, device identifiers, referring URL, pages visited, and timestamps for
          security, analytics, and abuse-prevention purposes.
        </p>
        <p>
          <strong style={strongStyle}>Cookies.</strong> We use first-party cookies to keep you
          signed in, remember your language preference and theme, and measure aggregate usage. You
          can disable cookies in your browser, but parts of the Service will not function without
          them.
        </p>

        <h2 style={h2Style}>2. How we use your information</h2>
        <ul style={ulStyle}>
          <li>To operate, maintain, and improve the Service.</li>
          <li>To create your account and authenticate you.</li>
          <li>To generate personalised study plans, recommendations, and AI feedback.</li>
          <li>To process subscriptions, payments, and renewals through Lemon Squeezy.</li>
          <li>
            To communicate service-related notices (account changes, billing receipts, security
            alerts) and, with your consent, occasional product updates.
          </li>
          <li>
            To detect, investigate, and prevent fraud, abuse, cheating, and violations of our
            Terms.
          </li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2 style={h2Style}>3. AI processing</h2>
        <p>
          To provide automated feedback on writing, speaking, and chat-based tutoring, we send the
          relevant submission (for example the text of your essay or a transcript of your speaking
          recording) to AI providers including Anthropic and OpenAI. These providers process the
          data only to return a response and, under their enterprise terms, do not use it to train
          their public models. We do not send your name, email, or payment information to AI
          providers.
        </p>

        <h2 style={h2Style}>4. How we share information</h2>
        <p>
          We do not sell your personal information. We share data only with:
        </p>
        <ul style={ulStyle}>
          <li>
            <strong style={strongStyle}>Service providers</strong> that help us run the Service,
            including Lemon Squeezy (payments), our cloud hosting provider, transactional email
            provider, and AI providers listed above. Each provider is contractually bound to
            protect your data and to use it only to perform their service for us.
          </li>
          <li>
            <strong style={strongStyle}>Legal and safety</strong>: when required by a court order,
            subpoena, or applicable law, or to protect the rights, property, or safety of
            StudyWithRaissov, our users, or others.
          </li>
          <li>
            <strong style={strongStyle}>Business transfers</strong>: if we are involved in a
            merger, acquisition, or sale of assets, your information may be transferred as part of
            that transaction, subject to the protections in this policy.
          </li>
        </ul>

        <h2 style={h2Style}>5. International transfers</h2>
        <p>
          We are based in Kazakhstan. Some of our service providers operate in other countries,
          including the European Union and the United States. By using the Service you consent to
          the transfer of your information to those countries, which may have different data
          protection laws than your country.
        </p>

        <h2 style={h2Style}>6. Data retention</h2>
        <p>
          We keep your account data for as long as your account is active. If you delete your
          account, we delete or anonymise your personal information within 90 days, except where we
          are required to retain it longer (for example billing records for tax purposes).
          Aggregated, de-identified data may be retained indefinitely.
        </p>

        <h2 style={h2Style}>7. Security</h2>
        <p>
          We use industry-standard measures to protect your information, including TLS encryption
          in transit, encrypted storage at rest for sensitive fields, access controls, and regular
          security review. No system is perfectly secure; we cannot guarantee absolute security and
          you use the Service at your own risk.
        </p>

        <h2 style={h2Style}>8. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, restrict,
          or delete your personal information, and to object to certain processing. You can
          exercise most of these rights directly in your account settings, or by emailing{" "}
          <a href="mailto:hello@studywithraissov.kz" style={linkStyle}>
            hello@studywithraissov.kz
          </a>
          . We will respond within 30 days.
        </p>

        <h2 style={h2Style}>9. Children</h2>
        <p>
          The Service is intended for users who are 13 years of age or older. We do not knowingly
          collect personal information from children under 13. If you believe a child under 13 has
          provided us with personal information, please contact us and we will delete it.
        </p>

        <h2 style={h2Style}>10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date
          at the top of this page reflects the most recent revision. Material changes will be
          announced by email or in-app notice before they take effect.
        </p>

        <h2 style={h2Style}>11. Contact</h2>
        <p>
          For privacy questions or to exercise your rights, contact us at{" "}
          <a href="mailto:hello@studywithraissov.kz" style={linkStyle}>
            hello@studywithraissov.kz
          </a>{" "}
          or via our{" "}
          <Link href="/contact" style={linkStyle}>
            contact page
          </Link>
          .
        </p>
      </article>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  background: "var(--bg)",
  color: "var(--ink)",
  minHeight: "100vh",
  padding: "48px 20px 80px",
};

const articleStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  fontSize: 15.5,
  lineHeight: 1.7,
  color: "var(--ink-soft)",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: 24,
  fontSize: 13,
  color: "var(--ink-mute)",
  textDecoration: "none",
  fontFamily: "'JetBrains Mono', monospace",
};

const h1Style: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: "var(--ink)",
  margin: "0 0 8px",
};

const h2Style: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "var(--ink)",
  margin: "32px 0 10px",
};

const metaStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--ink-mute)",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0 0 28px",
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 22,
  margin: "8px 0 0",
};

const strongStyle: React.CSSProperties = {
  color: "var(--ink)",
  fontWeight: 700,
};

const linkStyle: React.CSSProperties = {
  color: "var(--terra)",
  textDecoration: "underline",
};
