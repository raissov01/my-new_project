import Link from 'next/link';
import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface PricingProps {
  locale: Locale;
}

export function Pricing({ locale }: PricingProps) {
  const t = createTranslator(locale);

  return (
    <section id="pricing" style={{ padding: '80px 0', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span className="lp-eyebrow" style={{ marginBottom: 16, display: 'inline-flex' }}>{t('lp.pricing.eyebrow')}</span>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 800, margin: '0 0 14px', color: 'var(--ink)' }}>
              {t('lp.pricing.title')}
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}>
              {t('lp.pricing.subtitle')}
            </p>
          </div>
        </Reveal>

        <div className="lp-pricing">

          {/* ── FREE ── */}
          <Reveal>
            <div className="lp-plan" style={{ background: 'var(--paper)' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
                {t('lp.pricing.plan1Name')}
              </h3>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
                {t('lp.pricing.plan1Price')}{' '}
                <small style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-mute)', letterSpacing: 0 }}>
                  {t('lp.pricing.perMonth')}
                </small>
              </div>
              <p style={{ color: 'var(--ink-soft)', margin: 0 }}>{t('lp.pricing.plan1Desc')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {[t('lp.pricing.plan1f1'), t('lp.pricing.plan1f2'), t('lp.pricing.plan1f3'), t('lp.pricing.plan1f4')].map((f, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--ink-soft)', display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--terra)', fontWeight: 800, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15, letterSpacing: '-0.005em', transition: 'transform 0.15s, background 0.15s', textDecoration: 'none', background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--line-strong)' }}>
                {t('lp.pricing.plan1Cta')}
              </Link>
            </div>
          </Reveal>

          {/* ── 7-DAY TRIAL ── */}
          <Reveal>
            <div className="lp-plan" style={{ background: 'var(--ink)', color: '#fff', transform: 'translateY(-12px)', border: '2px solid #22c55e', boxShadow: '6px 6px 0 #22c55e' }}>
              <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                {t('lp.pricing.trialBadge')}
              </span>
              <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>
                {t('lp.pricing.trialName')}
              </h3>
              <div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
                  {t('lp.pricing.trialPrice')}{' '}
                  <small style={{ fontSize: 14, fontWeight: 500, color: '#A8A49E', letterSpacing: 0 }}>/ 7 күн</small>
                </div>
                <p style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, margin: '4px 0 0' }}>{t('lp.pricing.trialSub')}</p>
              </div>
              <p style={{ color: '#D4C7AE', margin: 0 }}>{t('lp.pricing.trialDesc')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {[t('lp.pricing.plan2f1'), t('lp.pricing.plan2f2'), t('lp.pricing.plan2f3'), t('lp.pricing.plan2f4')].map((f, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#FBF7F0', display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5 }}>
                    <span style={{ color: '#22c55e', fontWeight: 800, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px 24px', borderRadius: 999, fontWeight: 700, fontSize: 15, letterSpacing: '-0.005em', transition: 'transform 0.15s, background 0.15s', textDecoration: 'none', background: '#22c55e', color: '#fff', border: 'none' }}>
                {t('lp.pricing.trialCta')}
              </Link>
            </div>
          </Reveal>

          {/* ── PRO ── */}
          <Reveal>
            <div className="lp-plan" style={{ background: 'var(--ink)', color: '#fff' }}>
              <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--terra)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 99, border: '1.5px solid var(--ink)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                {t('lp.pricing.popular')}
              </span>
              <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>Pro</h3>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
                {t('lp.pricing.plan2Price')}{' '}
                <small style={{ fontSize: 14, fontWeight: 500, color: '#A8A49E', letterSpacing: 0 }}>{t('lp.pricing.perMonth')}</small>
              </div>
              <p style={{ color: '#D4C7AE', margin: 0 }}>{t('lp.pricing.plan2Desc')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {[t('lp.pricing.plan2f1'), t('lp.pricing.plan2f2'), t('lp.pricing.plan2f3'), t('lp.pricing.plan2f4'), t('lp.pricing.plan2f5'), t('lp.pricing.plan2f6')].map((f, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#FBF7F0', display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5 }}>
                    <span style={{ color: '#FBA968', fontWeight: 800, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15, letterSpacing: '-0.005em', transition: 'transform 0.15s, background 0.15s', textDecoration: 'none', background: '#fff', color: 'var(--ink)', border: 'none' }}>
                {t('lp.pricing.plan2Cta')}
              </Link>
            </div>
          </Reveal>

        </div>
      </div>

      <style>{`
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
        .lp-pricing {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          max-width: 1040px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .lp-pricing { grid-template-columns: repeat(3, 1fr); }
        }
        .lp-plan {
          border: 1.5px solid var(--ink);
          border-radius: 24px;
          padding: 32px 28px;
          box-shadow: 6px 6px 0 var(--ink);
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
        }
      `}</style>
    </section>
  );
}
