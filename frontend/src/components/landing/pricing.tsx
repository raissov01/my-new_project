import Link from 'next/link';
import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface PricingProps {
  locale: Locale;
}

export function Pricing({ locale }: PricingProps) {
  const t = createTranslator(locale);

  const plans = [
    {
      name: t('lp.pricing.plan1Name'),
      price: t('lp.pricing.plan1Price'),
      desc: t('lp.pricing.plan1Desc'),
      features: [
        t('lp.pricing.plan1f1'),
        t('lp.pricing.plan1f2'),
        t('lp.pricing.plan1f3'),
        t('lp.pricing.plan1f4'),
      ],
      cta: t('lp.pricing.plan1Cta'),
      ctaHref: '/signup',
      featured: false,
      ctaStyle: 'ghost',
    },
    {
      name: 'Pro',
      price: t('lp.pricing.plan2Price'),
      desc: t('lp.pricing.plan2Desc'),
      features: [
        t('lp.pricing.plan2f1'),
        t('lp.pricing.plan2f2'),
        t('lp.pricing.plan2f3'),
        t('lp.pricing.plan2f4'),
        t('lp.pricing.plan2f5'),
        t('lp.pricing.plan2f6'),
      ],
      cta: t('lp.pricing.plan2Cta'),
      ctaHref: '/signup',
      featured: true,
      popularTag: t('lp.pricing.popular'),
      ctaStyle: 'primary-inv',
    },
  ];

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
          {plans.map((plan) => (
            <Reveal key={plan.name}>
              <div
                className="lp-plan"
                style={{
                  background: plan.featured ? 'var(--ink)' : 'var(--paper)',
                  color: plan.featured ? '#fff' : 'inherit',
                  transform: plan.featured ? 'translateY(-12px)' : 'none',
                }}
              >
                {plan.featured && 'popularTag' in plan && (
                  <span style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--terra)', color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '5px 14px', borderRadius: 99, border: '1.5px solid var(--ink)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {(plan as typeof plans[1]).popularTag}
                  </span>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: plan.featured ? '#fff' : 'var(--ink)' }}>
                  {plan.name}
                </h3>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: plan.featured ? '#fff' : 'var(--ink)' }}>
                  {plan.price}{' '}
                  <small style={{ fontSize: 14, fontWeight: 500, color: plan.featured ? '#A8A49E' : 'var(--ink-mute)', letterSpacing: 0 }}>
                    {t('lp.pricing.perMonth')}
                  </small>
                </div>
                <p style={{ color: plan.featured ? '#D4C7AE' : 'var(--ink-soft)', margin: 0 }}>
                  {plan.desc}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {plan.features.map((f, fi) => (
                    <li key={fi} style={{
                      fontSize: 14, color: plan.featured ? '#FBF7F0' : 'var(--ink-soft)',
                      display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5,
                    }}>
                      <span style={{ color: plan.featured ? '#FBA968' : 'var(--terra)', fontWeight: 800, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15,
                    letterSpacing: '-0.005em', transition: 'transform 0.15s, background 0.15s', textDecoration: 'none',
                    ...(plan.ctaStyle === 'primary-inv'
                      ? { background: '#fff', color: 'var(--ink)', border: 'none', boxShadow: 'none' }
                      : { background: 'transparent', color: plan.featured ? '#fff' : 'var(--ink)', border: '1.5px solid var(--line-strong)' }),
                  }}
                >
                  {plan.cta}
                </Link>
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
        .lp-pricing {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          max-width: 680px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .lp-pricing { grid-template-columns: repeat(2, 1fr); }
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
