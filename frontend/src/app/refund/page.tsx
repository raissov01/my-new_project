import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Refund Policy for StudyWithRaissov subscriptions — when and how you can request a refund.",
  alternates: { canonical: "/refund" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 18, 2026";

export default function RefundPage() {
  return (
    <div style={pageStyle}>
      <article style={articleStyle}>
        <Link href="/" style={backLinkStyle}>
          &larr; Back to home
        </Link>

        <h1 style={h1Style}>Refund Policy</h1>
        <p style={metaStyle}>Last updated: {LAST_UPDATED}</p>

        <p>
          This Refund Policy applies to paid subscriptions to StudyWithRaissov purchased through{" "}
          <a href="https://studywithraissov.com" style={linkStyle}>
            studywithraissov.com
          </a>
          . Payments are processed by our payment provider, Lemon Squeezy.
        </p>

        <h2 style={h2Style}>1. Free trial</h2>
        <p>
          Where a free trial is offered, you may cancel at any time during the trial period from
          your account settings and you will not be charged. If you do not cancel before the trial
          ends, your subscription will automatically renew at the price disclosed at sign-up.
        </p>

        <h2 style={h2Style}>2. 7-day money-back guarantee</h2>
        <p>
          We offer a 7-day money-back guarantee on the first paid charge of a new subscription. If
          you are not satisfied with the Service, email{" "}
          <a href="mailto:hello@studywithraissov.kz" style={linkStyle}>
            hello@studywithraissov.kz
          </a>{" "}
          within 7 calendar days of the first charge and request a refund. We will process a full
          refund to the original payment method, typically within 5 to 10 business days depending
          on your bank.
        </p>
        <p>
          The 7-day money-back guarantee applies only to the first payment on a new subscription.
          Renewal payments and second or subsequent subscriptions on the same account are not
          covered.
        </p>

        <h2 style={h2Style}>3. Renewal charges</h2>
        <p>
          Subscriptions renew automatically until you cancel. To avoid being charged for the next
          billing period, cancel your subscription before its renewal date. You can cancel anytime
          from your account settings under Billing. Cancellation stops future renewals; you keep
          access to paid features until the end of the period you have already paid for.
        </p>
        <p>
          Renewal charges are generally non-refundable. If you forget to cancel and are charged for
          a new period that you do not intend to use, contact us within 7 days of the renewal
          charge and we will review your request at our discretion. We will normally issue a refund
          if you have not used paid features during that new period.
        </p>

        <h2 style={h2Style}>4. Annual plans</h2>
        <p>
          If you purchase an annual plan, the 7-day money-back guarantee in section 2 applies. If
          you cancel an annual plan after the 7-day window, you will keep access for the remainder
          of the paid year but a pro-rated refund will not be issued.
        </p>

        <h2 style={h2Style}>5. Exceptions</h2>
        <p>Refunds are not available in the following cases:</p>
        <ul style={ulStyle}>
          <li>
            The account has been suspended or terminated for violating our{" "}
            <Link href="/terms" style={linkStyle}>
              Terms of Service
            </Link>
            , including cheating, fraud, abuse, or sharing of credentials.
          </li>
          <li>
            More than 7 days have passed since the charge you are asking us to refund, except where
            local consumer-protection law requires otherwise.
          </li>
          <li>
            The request is for partial-month or partial-year refunds outside of the cases described
            above.
          </li>
        </ul>

        <h2 style={h2Style}>6. Statutory rights</h2>
        <p>
          Nothing in this Refund Policy limits any non-waivable rights you may have under the
          consumer-protection laws of your country of residence. If those laws give you stronger
          refund rights than this policy, those rights apply.
        </p>

        <h2 style={h2Style}>7. How to request a refund</h2>
        <p>Send an email to{" "}
          <a href="mailto:hello@studywithraissov.kz" style={linkStyle}>
            hello@studywithraissov.kz
          </a>{" "}
          from the email address registered to your account and include:
        </p>
        <ul style={ulStyle}>
          <li>The Lemon Squeezy order number, if you have it (it appears in your receipt).</li>
          <li>The date of the charge.</li>
          <li>A short reason for the request, so we can improve the Service.</li>
        </ul>
        <p>
          We reply to refund requests within 3 business days. Approved refunds are issued to the
          original payment method.
        </p>

        <h2 style={h2Style}>8. Contact</h2>
        <p>
          Questions about this Refund Policy can be sent to{" "}
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
