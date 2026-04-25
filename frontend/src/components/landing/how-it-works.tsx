import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface HowItWorksProps {
  locale: Locale;
}

export function HowItWorks({ locale }: HowItWorksProps) {
  const t = createTranslator(locale);

  const steps = [
    {
      num: '1',
      title: t('lp.how.step1Title'),
      body: t('lp.how.step1Body'),
      numBg: 'var(--terra)',
      illo: (
        <svg width="100" height="50" viewBox="0 0 100 50">
          <rect x="6" y="10" width="88" height="30" rx="6" fill="none" stroke="#1B1714" strokeWidth="2"/>
          <rect x="12" y="18" width="20" height="14" rx="3" fill="#C2500A"/>
          <rect x="36" y="18" width="20" height="14" rx="3" fill="#fff" stroke="#1B1714" strokeWidth="1.5"/>
          <rect x="60" y="18" width="20" height="14" rx="3" fill="#fff" stroke="#1B1714" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      num: '2',
      title: t('lp.how.step2Title'),
      body: t('lp.how.step2Body'),
      numBg: 'var(--blue)',
      illo: (
        <svg width="100" height="50" viewBox="0 0 100 50">
          <rect x="20" y="8" width="46" height="34" rx="4" fill="#F4D9C0" stroke="#1B1714" strokeWidth="1.5" transform="rotate(-6 43 25)"/>
          <rect x="26" y="12" width="46" height="34" rx="4" fill="#FBEEDC" stroke="#1B1714" strokeWidth="1.5" transform="rotate(-2 49 29)"/>
          <rect x="32" y="14" width="46" height="34" rx="4" fill="#fff" stroke="#1B1714" strokeWidth="2"/>
          <text x="55" y="34" fontFamily="Caveat,cursive" fontSize="14" textAnchor="middle" fill="#1B1714" fontWeight="700">study</text>
        </svg>
      ),
    },
    {
      num: '3',
      title: t('lp.how.step3Title'),
      body: t('lp.how.step3Body'),
      numBg: 'var(--green)',
      illo: (
        <svg width="100" height="50" viewBox="0 0 100 50">
          <path d="M 10 14 L 60 14 L 60 32 L 50 32 L 44 40 L 38 32 L 10 32 Z" fill="#fff" stroke="#1B1714" strokeWidth="2"/>
          <circle cx="22" cy="23" r="2.5" fill="#C2500A"/>
          <circle cx="32" cy="23" r="2.5" fill="#2563eb"/>
          <circle cx="42" cy="23" r="2.5" fill="#3F7D3F"/>
          <text x="78" y="28" fontFamily="Caveat,cursive" fontSize="14" textAnchor="middle" fill="#C2500A" fontWeight="700">+12pt</text>
        </svg>
      ),
    },
  ];

  return (
    <section id="how" style={{ padding: '80px 0', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span className="lp-eyebrow" style={{ marginBottom: 16, display: 'inline-flex' }}>{t('lp.how.eyebrow')}</span>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 800, margin: '0 0 14px', color: 'var(--ink)' }}>
              {t('lp.how.title')}
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}>
              {t('lp.how.subtitle')}
            </p>
          </div>
        </Reveal>
        <div className="lp-steps">
          {steps.map((step) => (
            <Reveal key={step.num}>
              <div className="lp-step">
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: step.numBg, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Caveat', cursive", fontSize: 28, fontWeight: 700,
                  marginBottom: 20, border: '2px solid var(--ink)',
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--ink)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}>
                  {step.body}
                </p>
                <div style={{
                  marginTop: 20, height: 80, background: '#fff', border: '1.5px solid var(--ink)',
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {step.illo}
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
        .lp-steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 760px) {
          .lp-steps { grid-template-columns: repeat(3, 1fr); }
        }
        .lp-step {
          background: var(--paper-2);
          border: 1.5px solid var(--ink);
          border-radius: 24px;
          padding: 32px 28px;
          box-shadow: 6px 6px 0 var(--ink);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .lp-step:hover {
          transform: translate(-2px, -2px);
          box-shadow: 8px 8px 0 var(--ink);
        }
      `}</style>
    </section>
  );
}
