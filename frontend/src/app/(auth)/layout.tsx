import Link from "next/link";
import { BrandLogo } from "@/components/layout";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-main px-4 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto mt-4 grid min-h-[calc(100vh-4.75rem)] max-w-6xl items-start gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-surface)] p-8 shadow-[var(--surface-shadow-strong)] lg:block lg:p-10">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo />
          </Link>
          <div className="mt-16 max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Study platform
            </p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
              Calm, focused learning for students and teachers.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[var(--text-secondary)]">
              Flashcards, class challenges, assignments, and progress tracking in one
              clean workspace designed to feel fast, clear, and professional.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <p className="text-sm text-[var(--text-secondary)]">Built for</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Students</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <p className="text-sm text-[var(--text-secondary)]">Prepared for</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Teachers</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <p className="text-sm text-[var(--text-secondary)]">Ready for</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">AI tools</p>
            </div>
          </div>
        </div>

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
