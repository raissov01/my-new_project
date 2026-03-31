import { redirect } from "next/navigation";
import { Mail, LockKeyhole, LogOut, ShieldCheck, UserCog } from "lucide-react";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getPomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import { logout } from "@/app/(auth)/actions";
import { updateEmail, updatePassword } from "@/app/(main)/settings/actions";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { RoleSection } from "@/components/settings/role-section";
import type { ProfileRole } from "@/types/database";

interface SettingsPageProps {
  searchParams: Promise<{ status?: string; error?: string }>;
}

function getFeedbackMessage(
  t: (key: string) => string,
  status?: string,
  error?: string
) {
  if (status === "email-updated") return { type: "success", text: t("settings.emailUpdated") };
  if (status === "password-updated") return { type: "success", text: t("settings.passwordUpdated") };

  switch (error) {
    case "settings-disabled":
      return { type: "error", text: t("settings.settingsDisabled") };
    case "email-required":
      return { type: "error", text: t("settings.emailRequired") };
    case "email-update-failed":
      return { type: "error", text: t("settings.emailUpdateFailed") };
    case "password-too-short":
      return { type: "error", text: t("settings.passwordTooShort") };
    case "passwords-mismatch":
      return { type: "error", text: t("settings.passwordsMismatch") };
    case "password-update-failed":
      return { type: "error", text: t("settings.passwordUpdateFailed") };
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
  const [{ status, error }, user, profile, pomodoro] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getCurrentProfile(),
    getPomodoroPreferences(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const feedback = getFeedbackMessage(t, status, error);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          Workspace
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
          {t("settings.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("settings.subtitle")}
        </p>

        {feedback && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-red-500/20 bg-red-500/8 text-red-500 dark:text-red-300"
                : "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--bg-soft)] p-3 text-indigo-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("settings.account")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {t("settings.accountDescription")}
                </p>
              </div>
            </div>

            <form action={updateEmail} className="mt-6 space-y-4">
              <Input
                name="email"
                type="email"
                label={t("settings.changeEmail")}
                defaultValue={user.email ?? ""}
                required
              />
              <Button type="submit">{t("settings.updateEmail")}</Button>
            </form>

            <form action={updatePassword} className="mt-6 space-y-4 border-t border-[var(--border)] pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--bg-soft)] p-3 text-amber-400">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {t("settings.changePassword")}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {t("settings.passwordDescription")}
                  </p>
                </div>
              </div>

              <Input
                name="password"
                type="password"
                label={t("settings.newPassword")}
                required
              />
              <Input
                name="confirm_password"
                type="password"
                label={t("settings.confirmPassword")}
                required
              />
              <Button type="submit">{t("settings.updatePassword")}</Button>
            </form>

            <form action={logout} className="mt-6 border-t border-[var(--border)] pt-6">
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
                {t("nav.logOut")}
              </Button>
            </form>
          </section>

          {/* Role management */}
          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--bg-soft)] p-3 text-violet-400">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("settings.roleTitle")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {t("settings.roleDescription")}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <RoleSection currentRole={(profile?.role as ProfileRole) ?? "student"} />
            </div>
          </section>

          {/* Privacy & security */}
          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--bg-soft)] p-3 text-slate-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("settings.privacySecurity")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {t("settings.privacyDescription")}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              <p>{profile?.username}</p>
              <p className="mt-1">{user.email}</p>
            </div>

            <div className="mt-6">
              <DeleteAccountSection />
            </div>
          </section>
        </div>

        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {t("settings.preferences")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            {t("settings.preferencesDescription")}
          </p>

          <div className="mt-6">
            <PreferencesPanel initialPomodoro={pomodoro} />
          </div>
        </section>
      </div>
    </div>
  );
}
