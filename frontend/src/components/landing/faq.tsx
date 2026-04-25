import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface FaqProps {
  locale: Locale;
}

export function Faq({ locale }: FaqProps) {
  const t = createTranslator(locale);

  const items = [
    { q: t('lp.faq.q1'), a: t('lp.faq.a1'), open: true },
    { q: t('lp.faq.q2'), a: t('lp.faq.a2') },
    { q: t('lp.faq.q3'), a: t('lp.faq.a3') },
    { q: t('lp.faq.q4'), a: t('lp.faq.a4') },
    { q: t('lp.faq.q5'), a: t('lp.faq.a5') },
    { q: t('lp.faq.q6'), a: t('lp.faq.a6') },
  ];

  return (
    <section id="faq" style={{ padding: '80px 0', position: 'relative', background: 'var(--paper-2)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span className="lp-eyebrow" style={{ marginBottom: 16, display: 'inline-flex' }}>{t('lp.faq.eyebrow')}</span>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              {t('lp.faq.title')}
            </h2>
          </div>
        </Reveal>

        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, i) => (
            <Reveal key={i}>
              <details
                open={item.open}
                style={{
                  background: 'var(--paper)', border: '1.5px solid var(--ink)',
                  borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', overflow: 'hidden',
                }}
              >
                <summary
                  style={{
                    listStyle: 'none', cursor: 'pointer',
                    padding: '18px 24px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 16,
                    fontWeight: 600, fontSize: 16, color: 'var(--ink)',
                  }}
                >
                  {item.q}
                  <span
                    className="lp-faq-plus"
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--terra)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontWeight: 700, transition: 'transform 0.2s',
                      fontSize: 18, lineHeight: 1,
                    }}
                  >
                    +
                  </span>
                </summary>
                <div style={{ padding: '0 24px 20px', fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
                  {item.a}
                </div>
              </details>
            </Reveal>
          ))}
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
        details[open] .lp-faq-plus {
          transform: rotate(45deg);
        }
        details summary::-webkit-details-marker {
          display: none;
        }
      `}</style>
    </section>
  );
}
