import { redirect } from "next/navigation";
import { Crown, CheckCircle2, Zap, BookOpen, Brain, Mic, Trophy, Gift, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getBillingStatus } from "@/features/settings/api";
import { PromoCheckout } from "./promo-checkout";

const PRO_FEATURES = [
  { icon: BookOpen, text: "Шексіз English Simulator сабақтары" },
  { icon: Brain,    text: "Толық IELTS тренажеры — Reading, Writing, Listening, Speaking" },
  { icon: Zap,      text: "AI Tutor — шексіз хабарламалар" },
  { icon: Trophy,   text: "AI Quiz генерация — кез-келген тақырыпта" },
  { icon: Mic,      text: "Speaking Practice — AI бағалауымен" },
  { icon: Crown,    text: "Барлық жаңа мүмкіндіктерге бірінші қол жеткізу" },
];

const FREE_FEATURES = [
  "Күніне 5 сабақ (English Simulator)",
  "3 IELTS тест/ай",
  "AI Tutor — 10 хабарлама/күн",
  "Flashcard жиындары",
  "Leaderboard, achievements",
];

const monoStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace" };

export default async function UpgradePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const billing = await getBillingStatus();
  if (billing?.isPro) redirect("/settings?upgraded=1");

  const checkoutURL = billing?.checkoutURL ?? "";
  // Trial checkout — same URL with trial flag (LemonSqueezy handles trial if enabled on product)
  const trialCheckoutURL = checkoutURL
    ? `${checkoutURL}&checkout[custom][trial]=true`
    : "";

  return (
    <>
      <script src="https://assets.lemonsqueezy.com/lemon.js" defer />

      <div className="page-shell py-4 sm:py-6">
        {/* ─── nd-mock-shell header ─── */}
        <div className="nd-mock-shell" style={{ marginBottom: 32 }}>
          <div className="nd-mock-bar">
            <Crown style={{ width: 16, height: 16, color: "var(--yellow)" }} />
            <h3>StudyWithRaissov Pro</h3>
            <span style={monoStyle}>Upgrade</span>
          </div>
        </div>

        {/* ─── Intro ─── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", marginBottom: 12 }}>
            Шексіз оқу мүмкіндігі
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-mute)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            AI-мен оқудың толық күшін ашыңыз. IELTS дайындығы, ағылшын тілі,
            AI сабақтар — бәрі бір жазылымда.
          </p>
        </div>

        {/* ─── 3-column pricing grid ─── */}
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", alignItems: "start" }}>

          {/* ── FREE ── */}
          <div
            style={{
              border: "1.5px solid var(--line)",
              borderRadius: 18,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              background: "var(--paper)",
            }}
          >
            <div>
              <p style={{ ...monoStyle, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 10 }}>FREE</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>$0</span>
                <span style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 3 }}>/ай</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>Мәңгілік тегін</p>
            </div>

            <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {FREE_FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-mute)" }}>
                  <CheckCircle2 style={{ width: 15, height: 15, color: "var(--ink-mute)", flexShrink: 0, marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              style={{
                borderRadius: 12,
                border: "1.5px solid var(--line)",
                background: "transparent",
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink-mute)",
                cursor: "not-allowed",
                opacity: 0.6,
                width: "100%",
              }}
            >
              Ағымдағы жоспар
            </button>
          </div>

          {/* ── 7-DAY TRIAL ── */}
          <div
            style={{
              border: "2px solid var(--green)",
              borderRadius: 18,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              background: "var(--paper)",
              position: "relative",
            }}
          >
            {/* Badge */}
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)" }}>
              <span
                style={{
                  borderRadius: 99,
                  background: "var(--green)",
                  padding: "4px 14px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  ...monoStyle,
                }}
              >
                7 КҮН ТЕГІН TRIAL
              </span>
            </div>

            <div>
              <p style={{ ...monoStyle, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--green)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Gift style={{ width: 13, height: 13 }} /> ТЕГІН СЫНАП КӨР
              </p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>₸0</span>
                <span style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 3 }}>/7 күн</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
                Одан кейін автоматты ₸2,000/ай
              </p>
            </div>

            <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-mute)" }}>
                  <Icon style={{ width: 15, height: 15, color: "var(--green)", flexShrink: 0, marginTop: 1 }} />
                  {text}
                </li>
              ))}
            </ul>

            {trialCheckoutURL ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a
                  href={trialCheckoutURL}
                  className="lemonsqueezy-button"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 12,
                    background: "var(--green)",
                    color: "#fff",
                    padding: "12px 0",
                    fontSize: 14,
                    fontWeight: 800,
                    textDecoration: "none",
                    width: "100%",
                  }}
                >
                  <Gift style={{ width: 15, height: 15 }} />
                  7 күн тегін бастау
                </a>
                <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-mute)" }}>
                  Картаңыз тіркеледі. 7 күннен кейін $9/ай алынады.
                  Кез-келген уақытта бас тарта аласыз.
                </p>
              </div>
            ) : (
              <button
                disabled
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: 12,
                  background: "rgba(34,197,94,0.15)",
                  color: "var(--green)",
                  border: "none",
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "not-allowed",
                  width: "100%",
                }}
              >
                <Gift style={{ width: 15, height: 15 }} /> Жүктелуде...
              </button>
            )}
          </div>

          {/* ── PRO ── */}
          <div
            style={{
              border: "2px solid var(--yellow)",
              borderRadius: 18,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              background: "var(--paper)",
              position: "relative",
            }}
          >
            {/* Badge */}
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)" }}>
              <span
                style={{
                  borderRadius: 99,
                  background: "var(--yellow)",
                  padding: "4px 14px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#7c5a00",
                  whiteSpace: "nowrap",
                  ...monoStyle,
                }}
              >
                ЕҢ ТАНЫМАЛ
              </span>
            </div>

            <div>
              <p style={{ ...monoStyle, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "var(--yellow)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Crown style={{ width: 13, height: 13 }} /> PRO
              </p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>$9</span>
                <span style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 3 }}>/ай</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>немесе $79/жыл (үнемдеу $29)</p>
            </div>

            <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-mute)" }}>
                  <Icon style={{ width: 15, height: 15, color: "var(--yellow)", flexShrink: 0, marginTop: 1 }} />
                  {text}
                </li>
              ))}
            </ul>

            {checkoutURL ? (
              <PromoCheckout baseCheckoutURL={checkoutURL} />
            ) : (
              <button
                disabled
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: 12,
                  background: "rgba(234,179,8,0.15)",
                  color: "var(--yellow)",
                  border: "none",
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "not-allowed",
                  width: "100%",
                }}
              >
                <Crown style={{ width: 15, height: 15 }} /> Жүктелуде...
              </button>
            )}
          </div>
        </div>

        {/* ─── Support ─── */}
        <div style={{ marginTop: 36, textAlign: "center", fontSize: 13, color: "var(--ink-mute)" }}>
          Сұрақтар бар ма?{" "}
          <a
            href="https://t.me/raissov01"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--ink-mute)", textDecoration: "underline" }}
          >
            Telegram: @raissov01
          </a>
        </div>
      </div>
    </>
  );
}
