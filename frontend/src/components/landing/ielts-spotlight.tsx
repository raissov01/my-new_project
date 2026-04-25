import Link from 'next/link';
import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface IeltsSpotlightProps {
  locale: Locale;
}

const bandRows = [
  { label: 'Listening', w: '85%', score: '7.5' },
  { label: 'Reading',   w: '90%', score: '8.0' },
  { label: 'Writing',   w: '78%', score: '7.0' },
  { label: 'Speaking',  w: '82%', score: '7.5' },
];

export function IeltsSpotlight({ locale }: IeltsSpotlightProps) {
  const t = createTranslator(locale);

  return (
    <section id="ielts" style={{ padding: '0 0 80px', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div className="lp-ielts-card">
            {/* Left */}
            <div>
              <span className="lp-eyebrow-light" style={{ marginBottom: 16, display: 'inline-flex' }}>
                {t('lp.ielts.eyebrow')}
              </span>
              <h2 style={{
                fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em',
                fontWeight: 800, margin: '0 0 18px', color: '#FBF7F0',
              }}>
                {t('lp.ielts.title')}
              </h2>
              <p style={{ color: '#FCE3CC', fontSize: 17, margin: '0 0 28px', maxWidth: 480 }}>
                {t('lp.ielts.body')}
              </p>
              <div className="lp-ielts-stats">
                <div className="lp-ielts-stat">
                  <strong>2,400+</strong><span>{t('lp.ielts.stat1')}</span>
                </div>
                <div className="lp-ielts-stat">
                  <strong>7.5</strong><span>{t('lp.ielts.stat2')}</span>
                </div>
                <div className="lp-ielts-stat">
                  <strong>92%</strong><span>{t('lp.ielts.stat3')}</span>
                </div>
                <div className="lp-ielts-stat">
                  <strong>{t('lp.ielts.stat4val')}</strong><span>{t('lp.ielts.stat4')}</span>
                </div>
              </div>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15,
                background: '#fff', color: 'var(--terra-deep)', textDecoration: 'none',
                letterSpacing: '-0.005em', transition: 'background 0.15s',
              }}>
                {t('lp.ielts.cta')}
              </Link>
            </div>

            {/* Right: band chart */}
            <div style={{
              background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.18)',
              borderRadius: 18, padding: 24, position: 'relative', zIndex: 1,
            }}>
              {bandRows.map((row) => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 0', borderBottom: '1px dashed rgba(255,255,255,.15)',
                }}>
                  <span style={{ fontSize: 13, color: '#FCE3CC', fontWeight: 500, width: 90, flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#fff', borderRadius: 99, width: row.w }} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', width: 36, textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>{row.score}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                borderTop: '2px solid rgba(255,255,255,.2)', marginTop: 8, paddingTop: 14,
              }}>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, width: 90, flexShrink: 0 }}>{t('lp.ielts.overall')}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#fff', borderRadius: 99, width: '84%' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', width: 36, textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>7.5</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        .lp-eyebrow-light {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #FCE3CC;
          font-weight: 600;
        }
        .lp-eyebrow-light::before {
          content: "";
          width: 24px;
          height: 1px;
          background: #FCE3CC;
        }
        .lp-ielts-card {
          background: var(--terra);
          color: #FBF7F0;
          border: 2px solid var(--ink);
          border-radius: 32px;
          padding: 56px 40px;
          box-shadow: 10px 10px 0 var(--ink);
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .lp-ielts-card::before {
          content: "";
          position: absolute;
          top: -40%; right: -20%;
          width: 60%; aspect-ratio: 1/1;
          background: radial-gradient(circle, rgba(255,255,255,.18), transparent 65%);
          pointer-events: none;
        }
        @media (min-width: 880px) {
          .lp-ielts-card { grid-template-columns: 1.1fr 1fr; padding: 64px 56px; }
        }
        .lp-ielts-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 32px;
        }
        .lp-ielts-stat {
          background: rgba(255,255,255,.1);
          border: 1.5px solid rgba(255,255,255,.2);
          border-radius: 14px;
          padding: 16px;
        }
        .lp-ielts-stat strong {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.03em;
          display: block;
          color: #fff;
          line-height: 1;
        }
        .lp-ielts-stat span {
          font-size: 12.5px;
          color: #FCE3CC;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
          display: block;
          margin-top: 6px;
        }
      `}</style>
    </section>
  );
}
