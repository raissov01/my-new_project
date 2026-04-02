"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { updateProfile } from "@/app/(main)/profile/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditProfileForm({
  initialUsername,
  initialEmail,
  initialAvatarUrl,
  initialBio,
}: {
  userId: string;
  initialUsername: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
  initialBio: string;
}) {
  const { t } = useLocale();

  return (
    <form action={updateProfile} className="mt-8 space-y-6">
      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar
            username={initialUsername || initialEmail}
            avatarUrl={initialAvatarUrl}
            size="md"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("profile.uploadAvatar")}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Paste a direct image URL for your avatar. Local file storage is no longer used.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <Camera className="h-3.5 w-3.5" />
              PNG, JPG, WEBP URL
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="username"
          name="username"
          label={t("auth.username")}
          defaultValue={initialUsername}
          required
        />
        <Input id="email" label={t("auth.email")} value={initialEmail} disabled />
      </div>

      <Input
        id="avatar_url"
        name="avatar_url"
        label={t("profile.uploadAvatar")}
        defaultValue={initialAvatarUrl ?? ""}
        placeholder="https://example.com/avatar.jpg"
      />

      <div>
        <label
          htmlFor="bio"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          {t("profile.bio")}
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={initialBio}
          rows={5}
          maxLength={280}
          className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          placeholder={t("profile.bioPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">{t("profile.saveProfile")}</Button>
        <Link href="/profile">
          <Button type="button" variant="outline">
            {t("set.cancel")}
          </Button>
        </Link>
      </div>
    </form>
  );
}
