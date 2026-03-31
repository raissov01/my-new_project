import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { EditProfileForm } from "@/components/profile/edit-profile-form";

interface EditProfilePageProps {
  searchParams: Promise<{ error?: string }>;
}

function getErrorMessage(
  error: string | undefined,
  t: (key: string) => string
) {
  switch (error) {
    case "username-required":
      return t("profile.usernameRequired");
    case "username-short":
      return t("profile.usernameTooShort");
    case "bio-too-long":
      return t("profile.bioTooLong");
    case "profile-save-failed":
      return t("profile.profileSaveFailed");
    case "profile-disabled":
      return t("profile.profileDisabled");
    default:
      return null;
  }
}

export default async function EditProfilePage({
  searchParams,
}: EditProfilePageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const [{ error }, user, profile] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) {
    redirect("/login");
  }

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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("profile.backToProfile")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {t("profile.editProfile")}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("profile.editProfileSubtitle")}
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-500/5 px-4 py-3 text-sm text-red-600">
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
