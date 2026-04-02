"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, ensureProfile, getCurrentUser } from "@/server/supabase/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import type { Database } from "@/lib/shared/types/database";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateProfile(formData: FormData) {
  if (DEV_MODE) {
    redirect("/profile/edit?error=profile-disabled");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const username = normalizeText(formData.get("username"));
  const avatarUrl = normalizeText(formData.get("avatar_url"));
  const bio = normalizeText(formData.get("bio"));

  if (!username) {
    redirect("/profile/edit?error=username-required");
  }

  if (username.length < 3) {
    redirect("/profile/edit?error=username-short");
  }

  if (bio.length > 280) {
    redirect("/profile/edit?error=bio-too-long");
  }

  await ensureProfile(user);

  const supabase = await createClient();
  const payload: Database["public"]["Tables"]["profiles"]["Update"] = {
    username,
    avatar_url: avatarUrl || null,
    bio: bio || null,
  };
  const profilesTable = supabase.from("profiles") as never as {
    update: (values: typeof payload) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { error } = await profilesTable.update(payload).eq("id", user.id);

  if (error) {
    redirect("/profile/edit?error=profile-save-failed");
  }

  await supabase.auth.updateUser({
    data: {
      username,
      avatar_url: avatarUrl || null,
      bio: bio || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  redirect("/profile?status=profile-updated");
}
