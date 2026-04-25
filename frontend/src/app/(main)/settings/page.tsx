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
import { BillingSection } from "@/features/settings/components/billing-section";
import { getBillingStatus } from "@/features/settings/api";
import type { ProfileRole } from "@/lib/shared/types/database";

interface SettingsPageProps {
  searchParams: Promise<{ error?: string }>;
}

function getFeedbackMessage(t: (key: string) => string, error?: string) {
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

  if (!user) redirect("/login");

  const [{ error }, profile, pomodoro, billing] = await Promise.all([
    searchParams,
    getCurrentProfile(user),
    getPomodoroPreferences(),
    getBillingStatus(),
  ]);

  const feedback = getFeedbackMessage(t, error);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("settings.title")}</h3>
          <span style={{ fontSize: 12, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace" }}>
            {profile?.username} · {user.email}
          </span>
        </div>
      </div>

      {feedback && (
        <div style={{
          marginBottom: 18,
          padding: "10px 16px",
          borderRadius: 12,
          fontSize: 13.5,
          border: feedback.type === "error" ? "1px solid rgba(220,38,38,.2)" : "1px solid rgba(16,185,129,.2)",
          background: feedback.type === "error" ? "rgba(220,38,38,.06)" : "rgba(16,185,129,.06)",
          color: feedback.type === "error" ? "var(--terra)" : "var(--green)",
        }}>
          {feedback.text}
        </div>
      )}

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr", alignItems: "start" }}
        className="xl:grid-cols-[1.05fr_1.2fr]">
        <div>
          {/* Account */}
          <div className="nd-settings-section">
            <div className="nd-settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}>
                <Mail style={{ width: 18, height: 18 }} />
              </div>
              <div className="nd-settings-lbl">
                <strong>{t("settings.account")}</strong>
                <span>{t("settings.accountDescription")}</span>
              </div>
            </div>
            <EmailChangeForm defaultEmail={user.email ?? ""} />

            <div style={{ borderTop: "1px dashed var(--line-strong)", margin: "18px 0" }} />

            <div className="nd-settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(245,158,11,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", flexShrink: 0 }}>
                <LockKeyhole style={{ width: 18, height: 18 }} />
              </div>
              <div className="nd-settings-lbl">
                <strong>{t("settings.changePassword")}</strong>
                <span>{t("settings.passwordDescription")}</span>
              </div>
            </div>
            <PasswordChangeForm />

            <div style={{ borderTop: "1px dashed var(--line-strong)", margin: "18px 0" }} />

            <form action={logout}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
                {t("nav.logOut")}
              </Button>
            </form>
          </div>

          {/* Role */}
          <div className="nd-settings-section">
            <div className="nd-settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(139,92,246,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6", flexShrink: 0 }}>
                <UserCog style={{ width: 18, height: 18 }} />
              </div>
              <div className="nd-settings-lbl">
                <strong>{t("settings.roleTitle")}</strong>
                <span>{t("settings.roleDescription")}</span>
              </div>
            </div>
            <RoleSection currentRole={(profile?.role as ProfileRole) ?? "student"} />
          </div>

          {/* Billing */}
          <BillingSection billing={billing} />

          {/* Privacy */}
          <div className="nd-settings-section">
            <div className="nd-settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(100,116,139,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                <ShieldCheck style={{ width: 18, height: 18 }} />
              </div>
              <div className="nd-settings-lbl">
                <strong>{t("settings.privacySecurity")}</strong>
                <span>{t("settings.privacyDescription")}</span>
              </div>
            </div>
            <div style={{ background: "var(--paper-2)", borderRadius: 10, padding: "10px 14px", margin: "12px 0", fontSize: 13 }}>
              <strong style={{ display: "block", color: "var(--ink)" }}>{profile?.username}</strong>
              <span style={{ color: "var(--ink-mute)" }}>{user.email}</span>
            </div>
            <DeleteAccountSection />
          </div>
        </div>

        {/* Preferences */}
        <div className="nd-settings-section" style={{ marginBottom: 0 }}>
          <h3>{t("settings.preferences")}</h3>
          <p style={{ fontSize: 13, color: "var(--ink-mute)", margin: "4px 0 18px" }}>
            {t("settings.preferencesDescription")}
          </p>
          <PreferencesPanel initialPomodoro={pomodoro} />
        </div>
      </div>
    </div>
  );
}
