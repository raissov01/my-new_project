import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/lib/shared/i18n';
import { createTranslator } from '@/lib/shared/i18n';

interface FooterProps {
  locale: Locale;
}

export function LandingFooter({ locale }: FooterProps) {
  const t = createTranslator(locale);

  return (
    <footer style={{ padding: '48px 0 56px', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div className="lp-foot">
          {/* Brand */}
          <div>
            <div aria-label="StudyWithRaissov">
              <Image
                className="lp-foot-logo-light"
                src="/brand-lockup.svg"
                alt=""
                width={220}
                height={51}
                style={{ height: 51, maxWidth: '100%', width: 'auto' }}
              />
              <Image
                className="lp-foot-logo-dark"
                src="/brand-lockup-dark.svg"
                alt=""
                width={220}
                height={51}
                style={{ height: 51, maxWidth: '100%', width: 'auto' }}
              />
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', maxWidth: 300, marginTop: 14, lineHeight: 1.6 }}>
              {t('lp.footer.tagline')}
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 style={{
              fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 14, fontWeight: 600, margin: '0 0 14px',
            }}>{t('lp.footer.platform')}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <li><Link href="#tools" style={footLinkStyle}>{t('lp.footer.tools')}</Link></li>
              <li><Link href="#ielts" style={footLinkStyle}>{t('lp.footer.ielts')}</Link></li>
              <li><Link href="#pricing" style={footLinkStyle}>{t('lp.footer.pricing')}</Link></li>
              <li><Link href="#faq" style={footLinkStyle}>FAQ</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 style={{
              fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 14, fontWeight: 600, margin: '0 0 14px',
            }}>{t('lp.footer.company')}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <li><Link href="#" style={footLinkStyle}>{t('lp.footer.about')}</Link></li>
              <li><Link href="#" style={footLinkStyle}>{t('lp.footer.blog')}</Link></li>
              <li><Link href="#" style={footLinkStyle}>{t('lp.footer.contact')}</Link></li>
            </ul>
          </div>

          {/* Language */}
          <div>
            <h4 style={{
              fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 14, fontWeight: 600, margin: '0 0 14px',
            }}>{t('lp.footer.language')}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <li><span style={footLinkStyle}>🇰🇿 Қазақша</span></li>
              <li><span style={footLinkStyle}>🇷🇺 Русский</span></li>
              <li><span style={footLinkStyle}>🇬🇧 English</span></li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: 40, paddingTop: 24, borderTop: '1px dashed var(--line-strong)',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
          gap: 14, fontSize: 12.5, color: 'var(--ink-mute)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span>© 2025 StudyWithRaissov · {t('lp.footer.city')}</span>
          <span>{t('lp.footer.madeIn')}</span>
        </div>
      </div>

      <style>{`
        .lp-foot {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        .lp-foot-logo-dark {
          display: none;
        }
        .dark .lp-foot-logo-light {
          display: none;
        }
        .dark .lp-foot-logo-dark {
          display: block;
        }
        @media (min-width: 760px) {
          .lp-foot { grid-template-columns: 1.5fr 1fr 1fr 1fr; }
        }
      `}</style>
    </footer>
  );
}

const footLinkStyle: React.CSSProperties = {
  fontSize: 14, color: 'var(--ink-soft)', textDecoration: 'none',
  transition: 'color 0.15s', cursor: 'pointer',
};
