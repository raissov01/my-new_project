"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAuthToken, getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateEmail(formData: FormData) {
  if (DEV_MODE) {
    redirect("/settings?error=settings-disabled");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const email = normalizeText(formData.get("email"));
  if (!email) {
    redirect("/settings?error=email-required");
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/account/email",
      userId: user.id,
      method: "PUT",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    redirect("/settings?error=email-update-failed");
  }

  revalidatePath("/settings");
  redirect("/settings?status=email-updated");
}

export async function updatePassword(formData: FormData) {
  if (DEV_MODE) {
    redirect("/settings?error=settings-disabled");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const password = normalizeText(formData.get("password"));
  const confirmPassword = normalizeText(formData.get("confirm_password"));

  if (password.length < 6) {
    redirect("/settings?error=password-too-short");
  }

  if (password !== confirmPassword) {
    redirect("/settings?error=passwords-mismatch");
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/account/password",
      userId: user.id,
      method: "PUT",
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    redirect("/settings?error=password-update-failed");
  }

  redirect("/settings?status=password-updated");
}

export async function deleteAccount(formData: FormData) {
  if (DEV_MODE) {
    redirect("/settings?error=settings-disabled");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const confirmation = normalizeText(formData.get("confirmation"));
  if (confirmation !== "DELETE") {
    redirect("/settings?error=delete-confirmation-invalid");
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/account",
      userId: user.id,
      method: "DELETE",
    });
  } catch {
    redirect("/settings?error=delete-account-failed");
  }

  await clearAuthToken();
  revalidatePath("/dashboard");
  redirect("/login?status=account-deleted");
}
