'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/providers/locale-provider';
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
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            padding: '10px 14px 10px 18px',
            background: 'rgba(251,247,240,0.9)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            boxShadow: '0 2px 8px rgba(27,23,20,.06)',
          }}
        >
          {/* Brand */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>
            <Image src="/brand-mark.svg" alt="" width={36} height={36} style={{ height: 36, width: 'auto' }} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <strong style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.02em' }}>
                StudyWith<span style={{ color: 'var(--terra)' }}>Raissov</span>
              </strong>
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace", marginTop: 3, fontWeight: 500, textTransform: 'uppercase' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Lang dropdown */}
            <div ref={langRef} style={{ position: 'relative' }}>
              <button
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
                    background: '#fff', border: '1px solid var(--line)', borderRadius: 14,
                    padding: 6, minWidth: 180,
                    boxShadow: '0 8px 24px -8px rgba(27,23,20,.12)',
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
                        color: opt.locale === locale ? 'var(--terra-deep)' : 'var(--ink-soft)',
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

            <Link href="/login" style={btnGhostSmStyle}>{t('lp.nav.login')}</Link>
            <Link href="/signup" style={btnPrimarySmStyle}>{t('lp.nav.signup')}</Link>
          </div>
        </nav>
      </div>

      <style>{`
        @media (min-width: 880px) {
          .lp-nav-links { display: flex !important; }
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
