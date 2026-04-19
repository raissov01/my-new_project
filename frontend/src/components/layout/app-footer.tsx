import Link from "next/link";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { BrandLogo } from "./brand-logo";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function AppFooter() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 xl:pl-24">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <div>
            <BrandLogo compact />
            <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--text-secondary)]">
              {t("landing.footerBody")}
            </p>
          </div>
          <FooterColumn
            title={t("landing.footerPlatform")}
            links={[
              { href: "/sets", label: t("landing.footerFlashcardLibrary") },
              { href: "/guide", label: t("landing.footerGuide") },
              { href: "/leaderboard", label: t("landing.footerRankings") },
            ]}
          />
          <FooterColumn
            title={t("landing.footerWorkspaces")}
            links={[
              { href: "/student/dashboard", label: t("landing.footerStudentDashboard") },
              { href: "/teacher/dashboard", label: t("landing.footerTeacherTools") },
              { href: "/sets/new/ai", label: t("landing.footerAIImport") },
            ]}
          />
          <FooterColumn
            title={t("landing.footerAccess")}
            links={[
              { href: "/login", label: t("landing.logIn") },
              { href: "/signup", label: t("landing.signUp") },
              { href: "/quizzes", label: t("landing.footerGuestPreview") },
            ]}
          />
        </div>
        <div className="section-divider mt-8" />
        <p className="mt-5 text-sm text-[var(--text-muted)]">
          {t("landing.footerCopyright").replace("{year}", String(new Date().getFullYear()))}
        </p>
      </div>
    </footer>
  );
}
