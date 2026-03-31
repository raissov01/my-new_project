"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Camera, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFilename(filename: string) {
  return filename.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

function extractAvatarStoragePath(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const marker = "/storage/v1/object/public/avatars/";
  const index = url.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return url.slice(index + marker.length).split("?")[0];
}

export function EditProfileForm({
  userId,
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
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const profilesTable = useMemo(
    () =>
      (supabase.from("profiles") as never as {
        update: (values: {
          username: string;
          avatar_url: string | null;
          bio: string | null;
        }) => {
          eq: (column: string, value: string) => Promise<{
            error: { message: string } | null;
          }>;
        };
      }),
    [supabase]
  );
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  async function uploadAvatar(file: File, currentAvatarUrl: string | null) {
    const extension = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/${Date.now()}-${sanitizeFilename(
      file.name.replace(/\.[^.]+$/, "")
    )}.${extension.toLowerCase()}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(t("profile.avatarUploadFailed"));
    }

    const oldPath = extractAvatarStoragePath(currentAvatarUrl);
    if (oldPath) {
      await supabase.storage.from("avatars").remove([oldPath]).catch(() => undefined);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  function validateAvatar(file: File) {
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      return t("profile.avatarTypeError");
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return t("profile.avatarSizeError");
    }

    return null;
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const validationError = validateAvatar(file);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim()) {
      setError(t("profile.usernameRequired"));
      return;
    }

    if (username.trim().length < 3) {
      setError(t("profile.usernameTooShort"));
      return;
    }

    if (bio.trim().length > 280) {
      setError(t("profile.bioTooLong"));
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        let nextAvatarUrl = avatarUrl;

        if (avatarFile) {
          nextAvatarUrl = await uploadAvatar(avatarFile, avatarUrl);
        }

        const payload = {
          username: username.trim(),
          avatar_url: nextAvatarUrl,
          bio: bio.trim() || null,
        };

        const { error: updateError } = await profilesTable.update(payload).eq("id", userId);

        if (updateError) {
          throw new Error(t("profile.profileSaveFailed"));
        }

        const { error: authError } = await supabase.auth.updateUser({
          data: {
            username: payload.username,
            avatar_url: payload.avatar_url,
            bio: payload.bio,
          },
        });

        if (authError) {
          throw new Error(t("profile.profileSaveFailed"));
        }

        setAvatarUrl(nextAvatarUrl);
        setAvatarFile(null);
        window.dispatchEvent(new Event("flashlearn-profile-updated"));
        router.push("/profile?status=profile-updated");
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : t("profile.profileSaveFailed")
        );
      }
    });
  }

  const displayedAvatarUrl = previewUrl ?? avatarUrl;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar
            username={username || initialUsername || initialEmail}
            avatarUrl={displayedAvatarUrl}
            size="md"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("profile.uploadAvatar")}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("profile.avatarUploadHint")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)]">
                <UploadCloud className="h-4 w-4" />
                {avatarFile ? t("profile.changeAvatar") : t("profile.uploadAvatar")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="sr-only"
                />
              </label>
              <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <Camera className="h-3.5 w-3.5" />
                {t("profile.avatarFormats")}
              </span>
            </div>
            {avatarFile && (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {t("profile.avatarPreview")} {avatarFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="username"
          label={t("auth.username")}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <Input id="email" label={t("auth.email")} value={initialEmail} disabled />
      </div>

      <div>
        <label
          htmlFor="bio"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          {t("profile.bio")}
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={5}
          maxLength={280}
          className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          placeholder={t("profile.bioPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={isPending}>
          {t("profile.saveProfile")}
        </Button>
        <Link href="/profile">
          <Button type="button" variant="outline">
            {t("set.cancel")}
          </Button>
        </Link>
      </div>
    </form>
  );
}
