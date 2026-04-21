import { redirect } from "next/navigation";
import { Mail, LockKeyhole, LogOut, ShieldCheck, UserCog } from "lucide-react";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/server/auth";
import { getPomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import { logout } from "@/app/(auth)/actions";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { Button } from "@/components/ui/button";
import { EmailChangeForm } from "@/features/settings/components/email-change-form";
import { PasswordChangeForm } from "@/features/settings/components/password-change-form";
import { PreferencesPanel } from "@/features/settings/components/preferences-panel";
import { DeleteAccountSection } from "@/features/settings/components/delete-account-section";
import { RoleSection } from "@/features/settings/components/role-section";
import type { ProfileRole } from "@/lib/shared/types/database";

interface SettingsPageProps {
  searchParams: Promise<{ error?: string }>;
}

function getFeedbackMessage(
  t: (key: string) => string,
  error?: string
) {
  switch (error) {
    case "settings-disabled":
      return { type: "error", text: t("settings.settingsDisabled") };
    case "delete-confirmation-invalid":
      return { type: "error", text: t("settings.deleteConfirmationInvalid") };
    case "delete-account-failed":
      return { type: "error", text: t("settings.deleteAccountFailed") };
    default:
      return null;
  }
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ error }, profile, pomodoro] = await Promise.all([
    searchParams,
    getCurrentProfile(user),
    getPomodoroPreferences(),
  ]);

  const feedback = getFeedbackMessage(t, error);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/* Header */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {t("settings.workspace")}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          {t("settings.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("settings.subtitle")}
        </p>

        {feedback && (
          <div
            className={`mt-5 rounded-[var(--radius-lg)] border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-red-200 bg-[var(--danger-soft)] text-[var(--danger)] dark:border-red-500/20 dark:text-red-300"
                : "border-emerald-200 bg-[var(--success-soft)] text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-300"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-5 xl:grid-cols-[1.05fr_1.2fr]">
        <div className="space-y-4 sm:space-y-5">
          {/* Account */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-blue-500/10 text-blue-500">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  {t("settings.account")}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                  {t("settings.accountDescription")}
                </p>
              </div>
            </div>

            <EmailChangeForm defaultEmail={user.email ?? ""} />

            <div className="section-divider my-5" />

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-amber-500/10 text-amber-500">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  {t("settings.changePassword")}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                  {t("settings.passwordDescription")}
                </p>
              </div>
            </div>

            <PasswordChangeForm />

            <div className="section-divider my-5" />

            <form action={logout}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
                {t("nav.logOut")}
              </Button>
            </form>
          </section>

          {/* Role */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-violet-500/10 text-violet-500">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  {t("settings.roleTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                  {t("settings.roleDescription")}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <RoleSection currentRole={(profile?.role as ProfileRole) ?? "student"} />
            </div>
          </section>

          {/* Privacy */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-slate-500/10 text-slate-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  {t("settings.privacySecurity")}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                  {t("settings.privacyDescription")}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">{profile?.username}</p>
              <p className="mt-1">{user.email}</p>
            </div>

            <div className="mt-5">
              <DeleteAccountSection />
            </div>
          </section>
        </div>

        {/* Preferences */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {t("settings.preferences")}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
            {t("settings.preferencesDescription")}
          </p>

          <div className="mt-5">
            <PreferencesPanel initialPomodoro={pomodoro} />
          </div>
        </section>
      </div>
    </div>
  );
}
