import Link from 'next/link';
import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface FinalCtaProps {
  locale: Locale;
}

export function FinalCta({ locale }: FinalCtaProps) {
  const t = createTranslator(locale);

  return (
    <section style={{ padding: '0 0 80px', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{
            background: 'var(--reverse-bg)', color: 'var(--reverse-fg)',
            borderRadius: 32, padding: '72px 40px',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
            border: '2px solid var(--reverse-border)', boxShadow: '10px 10px 0 var(--reverse-shadow)',
          }}>
            {/* Ambient glows */}
            <div style={{
              content: '', position: 'absolute', top: '-30%', left: '-10%',
              width: '50%', aspectRatio: '1', pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(194,80,10,.4), transparent 65%)',
            }} />
            <div style={{
              content: '', position: 'absolute', bottom: '-30%', right: '-10%',
              width: '50%', aspectRatio: '1', pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(37,99,235,.3), transparent 65%)',
            }} />

            <span className="lp-eyebrow-cta" style={{ marginBottom: 0, display: 'inline-flex', position: 'relative', zIndex: 1 }}>
              {t('lp.finalcta.eyebrow')}
            </span>
            <h2 style={{
              fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em',
              fontWeight: 800, color: 'var(--reverse-fg)', maxWidth: 680, margin: '14px auto 18px',
              position: 'relative', zIndex: 1,
            }}>
              {t('lp.finalcta.title')}
            </h2>
            <p style={{
              color: 'var(--reverse-fg-soft)', maxWidth: 560, margin: '0 auto 32px',
              fontSize: 17, position: 'relative', zIndex: 1,
            }}>
              {t('lp.finalcta.body')}
            </p>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '18px 32px', borderRadius: 999, fontWeight: 600, fontSize: 17,
              background: 'var(--reverse-btn-bg)', color: 'var(--reverse-btn-fg)', textDecoration: 'none',
              letterSpacing: '-0.005em', transition: 'background 0.15s, color 0.15s',
              position: 'relative', zIndex: 1,
            }}>
              {t('lp.finalcta.cta')}
            </Link>
          </div>
        </Reveal>
      </div>

      <style>{`
        .lp-eyebrow-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #FBA968;
          font-weight: 600;
          justify-content: center;
        }
        .lp-eyebrow-cta::before {
          content: "";
          width: 24px;
          height: 1px;
          background: #FBA968;
        }
      `}</style>
    </section>
  );
}
