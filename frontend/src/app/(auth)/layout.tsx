import Link from "next/link";
import { BrandLogo } from "@/components/layout";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-screen bg-gradient-main px-4 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto mt-4 grid min-h-[calc(100vh-4.75rem)] max-w-6xl items-start gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* Left panel — brand story */}
        <div className="hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-lg)] lg:block lg:p-10">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo />
          </Link>
          <div className="mt-14 max-w-xl">
            <div className="badge-primary mb-4">
              Premium IELTS Platform
            </div>
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] leading-[1.15] text-[var(--text-primary)] xl:text-5xl">
              Calm, focused learning for students and teachers.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-[var(--text-secondary)]">
              Flashcards, class challenges, assignments, and progress tracking in one
              clean workspace designed to feel fast, clear, and professional.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[var(--primary)] bg-[var(--bg-soft)] p-4">
              <p className="text-xs font-medium text-[var(--text-muted)]">Built for</p>
              <p className="mt-1.5 text-lg font-bold text-[var(--text-primary)]">Students</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-emerald-500 bg-[var(--bg-soft)] p-4">
              <p className="text-xs font-medium text-[var(--text-muted)]">Prepared for</p>
              <p className="mt-1.5 text-lg font-bold text-[var(--text-primary)]">Teachers</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] bg-[var(--bg-soft)] p-4">
              <p className="text-xs font-medium text-[var(--text-muted)]">Ready for</p>
              <p className="mt-1.5 text-lg font-bold text-[var(--text-primary)]">AI tools</p>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="w-full">
          <div className="mb-4 flex justify-center lg:hidden">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo />
            </Link>
          </div>
          <div className="mx-auto w-full max-w-[32rem]">{children}</div>
        </div>
      </div>
    </div>
  );
}
