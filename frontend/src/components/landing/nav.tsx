'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { useTheme } from '@/hooks/use-theme';
import type { Locale } from '@/lib/shared/i18n';

interface NavProps {
  locale: Locale;
}

const LANG_OPTIONS: { locale: Locale; flag: string; code: string; label: string }[] = [
  { locale: 'kk', flag: '🇰🇿', code: 'KZ', label: 'Қазақша' },
  { locale: 'ru', flag: '🇷🇺', code: 'RU', label: 'Русский' },
  { locale: 'en', flag: '🇬🇧', code: 'EN', label: 'English' },
];

export function LandingNav({ locale }: NavProps) {
  const { setLocale, t } = useLocale();
  const { theme, toggle: toggleTheme, mounted: themeMounted } = useTheme();
  const isDark = themeMounted && theme === 'dark';
  const [open, setOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const current = LANG_OPTIONS.find((l) => l.locale === locale) ?? LANG_OPTIONS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '14px 0 0',
        background: 'linear-gradient(180deg, var(--paper) 70%, transparent)',
      }}
    >
      <div className="lp-nav-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <nav
          className="lp-nav-shell"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            padding: '10px 14px 10px 18px',
            background: 'color-mix(in srgb, var(--paper) 90%, transparent)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,.4)' : '0 2px 8px rgba(27,23,20,.06)',
            color: 'var(--ink)',
          }}
        >
          {/* Brand */}
          <Link href="/" className="lp-nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>
            <Image src="/brand-mark.svg" alt="" width={36} height={36} style={{ height: 36, width: 'auto' }} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <strong className="lp-nav-brand-name" style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.02em' }}>
                StudyWith<span style={{ color: 'var(--terra)' }}>Raissov</span>
              </strong>
              <span className="lp-nav-brand-subtitle" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace", marginTop: 3, fontWeight: 500, textTransform: 'uppercase' }}>
                IELTS · FLASHCARDS · AI
              </span>
            </span>
          </Link>

          {/* Nav links (hidden on mobile) */}
          <div className="lp-nav-links" style={{ display: 'none', gap: 4 }}>
            <Link href="#how" style={navLinkStyle}>{t('lp.nav.how')}</Link>
            <Link href="#tools" style={navLinkStyle}>{t('lp.nav.tools')}</Link>
            <Link href="#ielts" style={navLinkStyle}>IELTS</Link>
            <Link href="#pricing" style={navLinkStyle}>{t('lp.nav.pricing')}</Link>
            <Link href="#faq" style={navLinkStyle}>FAQ</Link>
          </div>

          {/* Nav end */}
          <div className="lp-nav-end" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Theme toggle */}
            {themeMounted && (
              <button
                className="lp-nav-theme"
                onClick={toggleTheme}
                aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
                title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 999,
                  color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}

            {/* Lang dropdown */}
            <div ref={langRef} style={{ position: 'relative' }}>
              <button
                className="lp-nav-lang"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                aria-haspopup="menu"
                aria-expanded={open}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 999, fontSize: 13.5, fontWeight: 500,
                  color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{current.flag}</span>
                <span>{current.code}</span>
                <svg
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: 10, height: 10, opacity: 0.5, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
                >
                  <path d="M2 4l3 3 3-3" />
                </svg>
              </button>
              {open && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: isDark ? 'var(--paper-3)' : '#fff',
                    border: '1px solid var(--line)', borderRadius: 14,
                    padding: 6, minWidth: 180,
                    boxShadow: isDark ? '0 8px 24px -8px rgba(0,0,0,.5)' : '0 8px 24px -8px rgba(27,23,20,.12)',
                  }}
                >
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.locale}
                      role="menuitem"
                      onClick={() => { setLocale(opt.locale); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                        borderRadius: 8, fontSize: 14, fontWeight: 500,
                        color: opt.locale === locale ? (isDark ? '#FBA968' : 'var(--terra-deep)') : 'var(--ink-soft)',
                        background: opt.locale === locale ? 'var(--terra-tint)' : 'transparent',
                        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{opt.flag}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="lp-nav-login" style={btnGhostSmStyle}>{t('lp.nav.login')}</Link>
            <Link href="/signup" className="lp-nav-signup" style={btnPrimarySmStyle}>{t('lp.nav.signup')}</Link>
          </div>
        </nav>
      </div>

      <style>{`
        @media (min-width: 880px) {
          .lp-nav-links { display: flex !important; }
        }
        @media (max-width: 540px) {
          .lp-nav-container { padding: 0 12px !important; }
          .lp-nav-shell {
            gap: 8px !important;
            padding: 8px 9px 8px 10px !important;
            border-radius: 18px !important;
          }
          .lp-nav-brand { gap: 7px !important; min-width: 0; }
          .lp-nav-brand img { width: 28px !important; height: 28px !important; }
          .lp-nav-brand-name { font-size: 12.5px !important; white-space: nowrap; }
          .lp-nav-brand-subtitle { display: none !important; }
          .lp-nav-end { gap: 4px !important; }
          .lp-nav-lang { padding: 7px 8px !important; font-size: 12px !important; }
          .lp-nav-theme { width: 32px !important; height: 32px !important; }
          .lp-nav-login { display: none !important; }
          .lp-nav-signup {
            padding: 8px 12px !important;
            font-size: 12px !important;
            min-height: 34px;
          }
        }
        @media (max-width: 340px) {
          .lp-nav-container { padding-inline: 8px !important; }
          .lp-nav-shell { padding-inline: 8px !important; }
          .lp-nav-brand-name { max-width: 112px; overflow: hidden; text-overflow: ellipsis; }
          .lp-nav-signup { padding-inline: 8px !important; font-size: 11.5px !important; }
        }
      `}</style>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 999, fontSize: 14, fontWeight: 500,
  color: 'var(--ink-soft)', textDecoration: 'none', transition: 'background 0.15s',
};

const btnGhostSmStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '9px 18px', borderRadius: 999, fontWeight: 600, fontSize: 13.5,
  letterSpacing: '-0.005em', transition: 'transform 0.15s, box-shadow 0.2s, background 0.15s',
  whiteSpace: 'nowrap', color: 'var(--ink)', border: '1.5px solid var(--line-strong)',
  background: 'transparent', textDecoration: 'none',
};

const btnPrimarySmStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '9px 18px', borderRadius: 999, fontWeight: 600, fontSize: 13.5,
  letterSpacing: '-0.005em', transition: 'transform 0.15s, box-shadow 0.2s, background 0.15s',
  whiteSpace: 'nowrap', background: 'var(--terra)', color: '#fff',
  boxShadow: '0 8px 24px -8px rgba(27,23,20,.12)', textDecoration: 'none', border: 'none',
};
