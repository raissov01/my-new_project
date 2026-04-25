import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';
import { Reveal } from './reveal';

interface ToolsGridProps {
  locale: Locale;
}

const tools = [
  {
    bg: 'var(--terra-tint)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C2500A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h6M8 12h6M8 16h4"/>
      </svg>
    ),
    titleKey: 'lp.tools.t1Title',
    bodyKey: 'lp.tools.t1Body',
    tag: 'FLASHCARDS',
  },
  {
    bg: 'var(--blue-soft)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8M4 12h4M16 4v4M20 8h-4M4 16v4h4M16 20v-4M20 16h-4M4 8V4h4M12 8a4 4 0 100 8 4 4 0 000-8z"/>
      </svg>
    ),
    titleKey: 'lp.tools.t2Title',
    bodyKey: 'lp.tools.t2Body',
    tag: 'AI ASSISTANT',
  },
  {
    bg: 'var(--green-soft)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F7D3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM7 9h6M7 13h10M7 17h10"/>
      </svg>
    ),
    titleKey: 'lp.tools.t3Title',
    bodyKey: 'lp.tools.t3Body',
    tag: 'LIBRARY',
  },
  {
    bg: 'var(--yellow-soft)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8801A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v8M5 8l-3 6h6M19 8l3 6h-6M2 14a4 4 0 008 0M14 14a4 4 0 008 0"/>
      </svg>
    ),
    titleKey: 'lp.tools.t4Title',
    bodyKey: 'lp.tools.t4Body',
    tag: 'MOCK TESTS',
  },
  {
    bg: 'var(--terra-tint)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C2500A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
      </svg>
    ),
    titleKey: 'lp.tools.t5Title',
    bodyKey: 'lp.tools.t5Body',
    tag: 'SCHEDULE',
  },
  {
    bg: 'var(--blue-soft)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2M9 8V5a3 3 0 116 0v3M12 14v2"/>
      </svg>
    ),
    titleKey: 'lp.tools.t6Title',
    bodyKey: 'lp.tools.t6Body',
    tag: 'PROGRESS',
  },
];

export function ToolsGrid({ locale }: ToolsGridProps) {
  const t = createTranslator(locale);

  return (
    <section id="tools" style={{ padding: '80px 0', position: 'relative', background: 'var(--paper-2)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <span className="lp-eyebrow" style={{ marginBottom: 16, display: 'inline-flex' }}>{t('lp.tools.eyebrow')}</span>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 800, margin: '0 0 14px', color: 'var(--ink)' }}>
              {t('lp.tools.title')}
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}>
              {t('lp.tools.subtitle')}
            </p>
          </div>
        </Reveal>
        <div className="lp-tools-grid">
          {tools.map((tool) => (
            <Reveal key={tool.tag}>
              <div className="lp-tool">
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: tool.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)',
                }}>
                  {tool.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
                  {t(tool.titleKey)}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-soft)', margin: 0 }}>
                  {t(tool.bodyKey)}
                </p>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
                  letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-mute)',
                  fontWeight: 500, marginTop: 'auto', display: 'inline-flex', gap: 5,
                }}>
                  {tool.tag}
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
        .lp-tools-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 680px) {
          .lp-tools-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1000px) {
          .lp-tools-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .lp-tool {
          background: var(--paper);
          border: 1.5px solid var(--ink);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 4px 4px 0 var(--ink);
          transition: transform 0.15s, box-shadow 0.15s;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lp-tool:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 var(--ink);
        }
      `}</style>
    </section>
  );
}
