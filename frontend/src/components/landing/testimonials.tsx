import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface TestimonialsProps {
  locale: Locale;
}

export function Testimonials({ locale }: TestimonialsProps) {
  const t = createTranslator(locale);

  const quotes = [
    {
      text: t('lp.testi.q1'),
      name: t('lp.testi.q1name'),
      meta: t('lp.testi.q1meta'),
      initials: 'А',
      avatarBg: 'var(--terra)',
      cardBg: 'var(--paper)',
    },
    {
      text: t('lp.testi.q2'),
      name: t('lp.testi.q2name'),
      meta: t('lp.testi.q2meta'),
      initials: 'М',
      avatarBg: 'var(--blue)',
      cardBg: 'var(--terra-tint)',
    },
    {
      text: t('lp.testi.q3'),
      name: t('lp.testi.q3name'),
      meta: t('lp.testi.q3meta'),
      initials: 'Д',
      avatarBg: 'var(--green)',
      cardBg: 'var(--blue-soft)',
    },
  ];

  return (
    <section style={{ padding: '80px 0', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span className="lp-eyebrow" style={{ marginBottom: 16, display: 'inline-flex' }}>{t('lp.testi.eyebrow')}</span>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              {t('lp.testi.title')}
            </h2>
          </div>
        </Reveal>
        <div className="lp-quotes">
          {quotes.map((q, i) => (
            <Reveal key={i}>
              <div className="lp-quote" style={{ background: q.cardBg }}>
                <div style={{ color: 'var(--yellow)', fontSize: 16, letterSpacing: 2 }}>★★★★★</div>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--ink)', fontWeight: 500, margin: 0 }}>{q.text}</p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginTop: 'auto', paddingTop: 16,
                  borderTop: '1px dashed var(--line-strong)',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', background: q.avatarBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#fff', fontSize: 15,
                  }}>
                    {q.initials}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{q.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace" }}>{q.meta}</span>
                  </div>
                </div>
              </div>
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
        .lp-quotes {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 680px) {
          .lp-quotes { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1000px) {
          .lp-quotes { grid-template-columns: repeat(3, 1fr); }
        }
        .lp-quote {
          border: 1.5px solid var(--ink);
          border-radius: 18px;
          padding: 28px;
          box-shadow: 5px 5px 0 var(--ink);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }
      `}</style>
    </section>
  );
}
