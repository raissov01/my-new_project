import Link from 'next/link';
import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';

interface HeroProps {
  locale: Locale;
}

export function LandingHero({ locale }: HeroProps) {
  const t = createTranslator(locale);

  return (
    <section style={{ padding: '48px 0 80px', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div className="lp-hero-grid">
          {/* Left: content */}
          <div>
            <span className="lp-eyebrow" style={{ marginBottom: 20, display: 'inline-flex' }}>
              {t('lp.hero.eyebrow')}
            </span>
            <h1 style={{
              fontSize: 'clamp(40px,6vw,72px)', lineHeight: 1.04, letterSpacing: '-0.035em',
              fontWeight: 900, margin: '0 0 24px', color: 'var(--ink)',
            }}>
              {t('lp.hero.title1')}{' '}
              <span style={{ position: 'relative', color: 'var(--terra)' }} className="lp-underline">
                {t('lp.hero.title2')}
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ink-soft)', marginBottom: 32, maxWidth: 540, margin: '0 0 32px' }}>
              {t('lp.hero.lede')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
              <Link href="/signup" style={btnPrimaryLg}>{t('lp.hero.cta1')}</Link>
              <Link href="#how" style={btnGhostLg}>{t('lp.hero.cta2')}</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13.5, color: 'var(--ink-mute)' }}>
              <div style={{ display: 'flex' }}>
                {['А','М','Д','Н'].map((letter, i) => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: '50%', border: '2.5px solid var(--paper)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, color: '#fff',
                    marginLeft: i === 0 ? 0 : -8,
                    background: i === 0 ? 'var(--terra)' : i === 1 ? 'var(--blue)' : i === 2 ? 'var(--green)' : 'var(--yellow)',
                    ...(i === 3 ? { color: 'var(--ink)' } : {}),
                  }}>
                    {letter}
                  </div>
                ))}
              </div>
              <div>
                <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>2,400+</strong>{' '}
                {t('lp.hero.trust')}
              </div>
            </div>
          </div>

          {/* Right: illustration */}
          <div style={{ position: 'relative', aspectRatio: '1/1', maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* background blob */}
              <path d="M 90 240 Q 60 120 200 90 Q 360 60 410 180 Q 450 320 340 390 Q 200 450 130 380 Q 70 330 90 240 Z" fill="#FBEEDC" stroke="#1B1714" strokeWidth="2.5" strokeLinejoin="round"/>
              {/* desk surface */}
              <path d="M 80 360 L 400 360 L 380 400 L 100 400 Z" fill="#E5DCC9" stroke="#1B1714" strokeWidth="2.5" strokeLinejoin="round"/>
              {/* book stack */}
              <rect x="120" y="320" width="90" height="14" rx="3" fill="#2563eb" stroke="#1B1714" strokeWidth="2"/>
              <rect x="125" y="306" width="80" height="14" rx="3" fill="#3F7D3F" stroke="#1B1714" strokeWidth="2"/>
              <rect x="130" y="292" width="70" height="14" rx="3" fill="#E9B949" stroke="#1B1714" strokeWidth="2"/>
              <text x="165" y="302" fontFamily="Caveat, cursive" fontSize="11" textAnchor="middle" fill="#1B1714" fontWeight="700">IELTS</text>
              {/* student body shadow */}
              <ellipse cx="265" cy="395" rx="60" ry="8" fill="#1B1714" opacity=".15"/>
              {/* shirt */}
              <path d="M 220 280 Q 215 340 225 380 L 305 380 Q 315 340 310 280 L 290 270 L 240 270 Z" fill="#C2500A" stroke="#1B1714" strokeWidth="2.5" strokeLinejoin="round"/>
              {/* collar */}
              <path d="M 250 270 L 265 285 L 280 270" fill="none" stroke="#1B1714" strokeWidth="2.5" strokeLinecap="round"/>
              {/* arms */}
              <path d="M 220 285 Q 195 310 205 345 Q 215 360 230 350" fill="#C2500A" stroke="#1B1714" strokeWidth="2.5"/>
              <path d="M 310 285 Q 335 305 340 335 Q 335 348 320 345" fill="#C2500A" stroke="#1B1714" strokeWidth="2.5"/>
              {/* hands */}
              <ellipse cx="225" cy="350" rx="11" ry="9" fill="#F4D9C0" stroke="#1B1714" strokeWidth="2"/>
              <ellipse cx="320" cy="345" rx="11" ry="9" fill="#F4D9C0" stroke="#1B1714" strokeWidth="2"/>
              {/* flashcard */}
              <rect x="225" y="320" width="100" height="40" rx="6" fill="#fff" stroke="#1B1714" strokeWidth="2.5" transform="rotate(-3 275 340)"/>
              <text x="275" y="345" fontFamily="Caveat, cursive" fontSize="20" textAnchor="middle" fill="#C2500A" fontWeight="700" transform="rotate(-3 275 340)">obstacle</text>
              {/* head */}
              <ellipse cx="265" cy="220" rx="46" ry="52" fill="#F4D9C0" stroke="#1B1714" strokeWidth="2.5"/>
              {/* hair */}
              <path d="M 220 200 Q 215 160 250 152 Q 290 145 305 168 Q 315 190 312 215 Q 308 200 295 195 Q 270 200 235 205 Q 222 208 220 200 Z" fill="#1B1714"/>
              {/* ear */}
              <ellipse cx="220" cy="225" rx="6" ry="9" fill="#F4D9C0" stroke="#1B1714" strokeWidth="2"/>
              {/* glasses */}
              <circle cx="248" cy="223" r="11" fill="none" stroke="#1B1714" strokeWidth="2.5"/>
              <circle cx="282" cy="223" r="11" fill="none" stroke="#1B1714" strokeWidth="2.5"/>
              <line x1="259" y1="223" x2="271" y2="223" stroke="#1B1714" strokeWidth="2.5"/>
              {/* eyes */}
              <circle cx="248" cy="223" r="2.5" fill="#1B1714"/>
              <circle cx="282" cy="223" r="2.5" fill="#1B1714"/>
              {/* smile */}
              <path d="M 252 245 Q 265 255 278 245" fill="none" stroke="#1B1714" strokeWidth="2.5" strokeLinecap="round"/>
              {/* cheeks */}
              <ellipse cx="232" cy="240" rx="6" ry="4" fill="#C2500A" opacity=".35"/>
              <ellipse cx="298" cy="240" rx="6" ry="4" fill="#C2500A" opacity=".35"/>
              {/* sparkles */}
              <g stroke="#C2500A" strokeWidth="2" strokeLinecap="round" fill="none">
                <path d="M 120 130 L 120 145 M 112 137 L 128 137"/>
                <path d="M 380 140 L 380 152 M 374 146 L 386 146"/>
                <path d="M 405 280 L 405 290 M 400 285 L 410 285"/>
              </g>
              {/* AI chat bubble */}
              <g transform="translate(340 100)">
                <rect x="0" y="0" width="110" height="46" rx="10" fill="#fff" stroke="#1B1714" strokeWidth="2.5"/>
                <path d="M 18 46 L 22 56 L 30 46" fill="#fff" stroke="#1B1714" strokeWidth="2.5" strokeLinejoin="round"/>
                <circle cx="18" cy="22" r="4" fill="#C2500A"/>
                <circle cx="32" cy="22" r="4" fill="#2563eb"/>
                <circle cx="46" cy="22" r="4" fill="#3F7D3F"/>
                <text x="68" y="28" fontFamily="Caveat,cursive" fontSize="18" fill="#1B1714" fontWeight="700" textAnchor="middle">AI</text>
              </g>
            </svg>

            {/* Floater cards */}
            <div className="lp-floater lp-f1">
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--blue)', color: '#fff', fontWeight: 800, fontSize: 15 }}>A+</div>
              <div>
                {t('lp.hero.f1')}
                <small style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-mute)', marginTop: 2 }}>{t('lp.hero.f1sub')}</small>
              </div>
            </div>
            <div className="lp-floater lp-f2">
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--green)', color: '#fff', fontWeight: 800, fontSize: 15 }}>✓</div>
              <div>
                {t('lp.hero.f2')}
                <small style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-mute)', marginTop: 2 }}>{t('lp.hero.f2sub')}</small>
              </div>
            </div>
            <div className="lp-floater lp-f3">
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--terra)', color: '#fff', fontWeight: 800, fontSize: 15 }}>AI</div>
              <div>
                {t('lp.hero.f3')}
                <small style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-mute)', marginTop: 2 }}>{t('lp.hero.f3sub')}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lp-hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        @media (min-width: 1000px) {
          .lp-hero-grid { grid-template-columns: 1.05fr 1fr; gap: 72px; }
        }
        .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--terra);
          font-weight: 600;
        }
        .lp-eyebrow::before {
          content: "";
          width: 24px;
          height: 1px;
          background: var(--terra);
        }
        .lp-underline::after {
          content: "";
          position: absolute;
          left: -2%; right: -2%; bottom: -6px;
          height: 14px;
          background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'><path d='M2 9 Q 50 2, 100 7 T 198 6' stroke='%23C2500A' stroke-width='3' fill='none' stroke-linecap='round'/></svg>") no-repeat center/100% 100%;
        }
        .lp-floater {
          position: absolute;
          background: #fff;
          border: 1.5px solid var(--ink);
          box-shadow: 6px 6px 0 var(--ink);
          padding: 12px 16px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          font-weight: 600;
          animation: lp-bob 4s ease-in-out infinite;
        }
        .lp-f1 { top: 8%; left: -6%; animation-delay: 0s; }
        .lp-f2 { bottom: 18%; right: -10%; animation-delay: 1.2s; }
        .lp-f3 { bottom: -2%; left: 6%; animation-delay: 2.4s; }
        @keyframes lp-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-floater { animation: none; }
        }
        @media (max-width: 999px) {
          .lp-f1 { left: 0; }
          .lp-f2 { right: 0; }
        }
      `}</style>
    </section>
  );
}

const btnPrimaryLg: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '18px 32px', borderRadius: 999, fontWeight: 600, fontSize: 17,
  background: 'var(--terra)', color: '#fff', textDecoration: 'none',
  boxShadow: '0 8px 24px -8px rgba(27,23,20,.12)', letterSpacing: '-0.005em',
  transition: 'transform 0.15s, box-shadow 0.2s, background 0.15s', whiteSpace: 'nowrap',
};

const btnGhostLg: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '18px 32px', borderRadius: 999, fontWeight: 600, fontSize: 17,
  background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--line-strong)',
  textDecoration: 'none', letterSpacing: '-0.005em',
  transition: 'transform 0.15s, box-shadow 0.2s, background 0.15s', whiteSpace: 'nowrap',
};
