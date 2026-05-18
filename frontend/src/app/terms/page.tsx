import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for StudyWithRaissov — rules for using our IELTS and NUET preparation platform.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 18, 2026";

export default function TermsPage() {
  return (
    <div style={pageStyle}>
      <article style={articleStyle}>
        <Link href="/" style={backLinkStyle}>
          &larr; Back to home
        </Link>

        <h1 style={h1Style}>Terms of Service</h1>
        <p style={metaStyle}>Last updated: {LAST_UPDATED}</p>

        <p>
          Welcome to StudyWithRaissov. These Terms of Service (&ldquo;Terms&rdquo;) govern your
          access to and use of the website located at{" "}
          <a href="https://studywithraissov.com" style={linkStyle}>
            studywithraissov.com
          </a>{" "}
          and any related services (collectively, the &ldquo;Service&rdquo;) operated by
          StudyWithRaissov (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating
          an account or using the Service you agree to be bound by these Terms. If you do not
          agree, do not use the Service.
        </p>

        <h2 style={h2Style}>1. Service description</h2>
        <p>
          StudyWithRaissov is an online education platform that provides IELTS and NUET exam
          preparation tools, including flashcards, quizzes, AI-assisted speaking and writing
          practice, listening exercises, study plans, and related learning content.
        </p>

        <h2 style={h2Style}>2. Eligibility and account registration</h2>
        <p>
          You must be at least 13 years old to use the Service. If you are under 18 you must have
          your parent or legal guardian&rsquo;s permission. When you create an account you agree to
          provide accurate information and to keep your password confidential. You are responsible
          for all activity that occurs under your account.
        </p>

        <h2 style={h2Style}>3. Subscriptions and billing</h2>
        <p>
          Some features of the Service require a paid subscription. Subscription fees, billing
          cycle, and trial periods are displayed at the point of purchase. By starting a
          subscription you authorize us and our payment processor, Lemon Squeezy, to charge the
          payment method you provide on a recurring basis until you cancel. You may cancel your
          subscription at any time from your account settings; cancellation stops future billing
          but does not, by itself, generate a refund for the current period. Refund eligibility is
          described in our{" "}
          <Link href="/refund" style={linkStyle}>
            Refund Policy
          </Link>
          .
        </p>

        <h2 style={h2Style}>4. Free trials</h2>
        <p>
          We may offer free trials of paid subscriptions. Unless you cancel before the trial ends,
          your subscription will automatically convert to a paid plan and your payment method will
          be charged at the then-current rate. The terms of any trial offer will be disclosed at
          the time you sign up.
        </p>

        <h2 style={h2Style}>5. Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul style={ulStyle}>
          <li>Violate any applicable law, regulation, or third-party right.</li>
          <li>
            Upload or share content that is unlawful, harmful, harassing, defamatory, or that
            infringes intellectual property rights.
          </li>
          <li>
            Attempt to gain unauthorized access to other accounts, our systems, or related
            networks.
          </li>
          <li>
            Reverse engineer, scrape, or copy substantial portions of the Service&rsquo;s content
            for commercial use without our written permission.
          </li>
          <li>Resell, sublicense, or share your account credentials with third parties.</li>
          <li>Use the Service to cheat on, impersonate during, or disrupt any real examination.</li>
        </ul>

        <h2 style={h2Style}>6. User content</h2>
        <p>
          You retain ownership of any content you submit (for example, notes, written essays,
          flashcard sets, or recordings). By submitting content you grant us a worldwide,
          non-exclusive, royalty-free licence to host, process, and display that content solely for
          the purpose of operating and improving the Service. You are responsible for the content
          you submit and you represent that you have the right to submit it.
        </p>

        <h2 style={h2Style}>7. AI features</h2>
        <p>
          The Service includes AI-assisted features such as automated feedback on writing and
          speaking. AI output is generated automatically and may contain inaccuracies. Scores and
          feedback produced by the Service are educational estimates and are not affiliated with,
          endorsed by, or guaranteed to match an official IELTS or NUET examiner result. Do not
          rely on AI output for legal, medical, or other professional decisions.
        </p>

        <h2 style={h2Style}>8. Intellectual property</h2>
        <p>
          The Service, including all software, text, graphics, logos, audio, and lesson content
          (other than user content), is owned by StudyWithRaissov or its licensors and is protected
          by intellectual property laws. We grant you a limited, non-exclusive, non-transferable
          licence to access the Service for your personal, non-commercial study use.
        </p>

        <h2 style={h2Style}>9. Termination</h2>
        <p>
          You may stop using the Service at any time and delete your account from settings. We may
          suspend or terminate your access if we reasonably believe you have violated these Terms,
          if required by law, or if continuing to provide the Service to you creates a security or
          legal risk. We will, where reasonable, give you notice before suspension.
        </p>

        <h2 style={h2Style}>10. Disclaimer of warranties</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind, whether express or implied. We do not warrant that the Service
          will be uninterrupted, error-free, or that it will produce any particular exam score or
          outcome.
        </p>

        <h2 style={h2Style}>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, StudyWithRaissov and its affiliates will not be
          liable for any indirect, incidental, special, consequential, or punitive damages, or any
          loss of profits or revenues, whether incurred directly or indirectly. Our total liability
          for any claim arising out of or relating to the Service will not exceed the amount you
          paid us in the twelve (12) months preceding the event giving rise to the claim.
        </p>

        <h2 style={h2Style}>12. Governing law</h2>
        <p>
          These Terms are governed by the laws of the Republic of Kazakhstan, without regard to its
          conflict-of-law rules. Any dispute that cannot be resolved informally will be brought in
          the competent courts of Almaty, Kazakhstan, unless local consumer-protection law gives
          you the right to bring proceedings in your place of residence.
        </p>

        <h2 style={h2Style}>13. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. If we make a material change we will notify
          you by email or by a notice in the Service before the change takes effect. Continued use
          of the Service after the change becomes effective constitutes acceptance of the updated
          Terms.
        </p>

        <h2 style={h2Style}>14. Contact</h2>
        <p>
          Questions about these Terms can be sent to{" "}
          <a href="mailto:hello@studywithraissov.kz" style={linkStyle}>
            hello@studywithraissov.kz
          </a>{" "}
          or through our{" "}
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

const linkStyle: React.CSSProperties = {
  color: "var(--terra)",
  textDecoration: "underline",
};
