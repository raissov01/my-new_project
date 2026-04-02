"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";

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

  try {
    await fetchBackendJson({
      path: "/api/v1/profile",
      userId: user.id,
      method: "PUT",
      body: JSON.stringify({
        username,
        avatarUrl: avatarUrl || null,
        bio: bio || null,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    redirect("/profile/edit?error=profile-save-failed");
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  redirect("/profile?status=profile-updated");
}
