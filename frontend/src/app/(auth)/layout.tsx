import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  const isLogin = !pathname.includes("signup");

  return (
    <div className="nd-auth-split">
      {/* ── Left: dark illustration panel ── */}
      <aside className="nd-auth-illo">
        <Link href="/" className="nd-auth-brand" style={{ textDecoration: "none" }}>
          <Image src="/icon-192.png" alt="logo" width={36} height={36} style={{ borderRadius: 8 }} />
          <div className="nd-auth-brand-text">
            <strong>StudyWith<em>Raissov</em></strong>
            <span>IELTS · AI · CARDS</span>
          </div>
        </Link>

        <div className="nd-auth-illo-content">
          <div className="nd-eyebrow" style={{ color: "#FBA968", marginBottom: 24 }}>
            <span style={{ background: "#FBA968", width: 20, height: 1 }}></span>
            Қош келдің
          </div>
          <h1 style={{ fontSize: "clamp(34px,4.5vw,52px)", color: "#FBF7F0", lineHeight: 1.08, fontWeight: 900, letterSpacing: "-.03em", marginBottom: 18 }}>
            Бүгін <span style={{ fontFamily: "'Caveat',cursive", color: "#FBA968" }}>үйренуді</span> бастайық
          </h1>
          <p style={{ color: "#FCE3CC", fontSize: 16, lineHeight: 1.65, maxWidth: 400, margin: 0 }}>
            Күніне 20 минут — нәтиже 3 айда. AI көмекші, флэшкарталар және Раиссов ағайдың дәрістері.
          </p>

          <div className="nd-auth-stats">
            <div className="nd-auth-stat">
              <strong>2,400+</strong>
              <span>Студент</span>
            </div>
            <div className="nd-auth-stat">
              <strong>7.5</strong>
              <span>Орта балы</span>
            </div>
            <div className="nd-auth-stat">
              <strong>92%</strong>
              <span>Мақсатқа жетті</span>
            </div>
          </div>

          <div className="nd-auth-quote">
            <div className="nd-auth-quote-stars">★★★★★</div>
            <p>«Үш ай ішінде Band 6.5-тен 8.0-ге өстім. AI эссе тексеру керемет.»</p>
            <div className="nd-auth-quote-who">
              <div className="nd-auth-quote-ava">А</div>
              Айгерім · Band 8.0
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right: form panel ── */}
      <div className="nd-auth-form-side">
        <div className="nd-auth-form-wrap">
          {/* Mobile logo */}
          <div style={{ textAlign: "center", marginBottom: 24, display: "none" }} className="nd-mobile-logo">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <Image src="/icon-192.png" alt="logo" width={32} height={32} style={{ borderRadius: 6 }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>
                StudyWith<span style={{ color: "var(--terra)" }}>Raissov</span>
              </span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="nd-auth-tabs">
            <Link href="/login" className={isLogin ? "active" : ""}>Кіру</Link>
            <Link href="/signup" className={!isLogin ? "active" : ""}>Тіркелу</Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
