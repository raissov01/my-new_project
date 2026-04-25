import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { EditProfileForm } from "@/features/profile/components/edit-profile-form";

interface EditProfilePageProps {
  searchParams: Promise<{ error?: string }>;
}

function getErrorMessage(error: string | undefined, t: (key: string) => string) {
  switch (error) {
    case "username-required": return t("profile.usernameRequired");
    case "username-short": return t("profile.usernameTooShort");
    case "bio-too-long": return t("profile.bioTooLong");
    case "profile-save-failed": return t("profile.profileSaveFailed");
    case "profile-disabled": return t("profile.profileDisabled");
    default: return null;
  }
}

export default async function EditProfilePage({ searchParams }: EditProfilePageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const [{ error }, user, profile] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) redirect("/login");

  const metadata =
    "user_metadata" in user && typeof user.user_metadata === "object"
      ? user.user_metadata
      : undefined;
  const username =
    profile?.username ??
    (typeof metadata?.username === "string" ? metadata.username : "") ??
    "";
  const errorMessage = getErrorMessage(error, t);

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/profile" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("profile.backToProfile")}
          </Link>
          <h3>{t("profile.editProfile")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("profile.editProfileSubtitle")}
          </span>
        </div>
      </div>

      <div className="nd-settings-section">
        {errorMessage && (
          <div style={{ marginBottom: 18, padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(220,38,38,.2)", background: "rgba(220,38,38,.06)", color: "var(--terra)", fontSize: 13.5 }}>
            {errorMessage}
          </div>
        )}
        <EditProfileForm
          userId={user.id}
          initialUsername={username}
          initialEmail={user.email ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          initialBio={profile?.bio ?? ""}
        />
      </div>
    </div>
  );
}
