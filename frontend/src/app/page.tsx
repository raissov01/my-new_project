import { redirect } from "next/navigation";
import { getAppHomePath, getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ToolsGrid } from "@/components/landing/tools-grid";
import { IeltsSpotlight } from "@/components/landing/ielts-spotlight";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default async function LandingPage() {
  // Preserve existing auth redirect logic
  const user = await getCurrentUser();
  if (user) {
    redirect(await getAppHomePath(user));
  }

  const locale = await getServerLocale();

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: 'var(--paper)',
        color: 'var(--ink)',
        lineHeight: 1.55,
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      {/* Dot grid texture */}
      <div
        aria-hidden="true"
        style={{
          content: '',
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(194,80,10,.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(180deg, #000 0%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 80%)',
        }}
      />

      {/* Navigation */}
      <LandingNav locale={locale} />

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <LandingHero locale={locale} />
        <HowItWorks locale={locale} />
        <ToolsGrid locale={locale} />
        <IeltsSpotlight locale={locale} />
        <Testimonials locale={locale} />
        <Pricing locale={locale} />
        <Faq locale={locale} />
        <FinalCta locale={locale} />
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
