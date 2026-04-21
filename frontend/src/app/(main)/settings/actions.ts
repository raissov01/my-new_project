"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAuthToken, getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export type UpdateEmailState = {
  status: "idle" | "success" | "error";
  emailError?: string;
  error?: string;
};

export async function updateEmail(
  _prev: UpdateEmailState,
  formData: FormData
): Promise<UpdateEmailState> {
  if (DEV_MODE) {
    redirect("/settings?error=settings-disabled");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const email = normalizeText(formData.get("email"));
  if (!email) {
    return { status: "error", emailError: "email-required" };
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
    return { status: "error", error: "email-update-failed" };
  }

  revalidatePath("/settings");
  return { status: "success" };
}

export type UpdatePasswordState = {
  status: "idle" | "success" | "error";
  passwordError?: string;
  confirmError?: string;
  error?: string;
};

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  if (DEV_MODE) {
    redirect("/settings?error=settings-disabled");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const password = normalizeText(formData.get("password"));
  const confirmPassword = normalizeText(formData.get("confirm_password"));

  if (password.length < 8) {
    return { status: "error", passwordError: "password-too-short" };
  }

  if (password !== confirmPassword) {
    return { status: "error", confirmError: "passwords-mismatch" };
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
    return { status: "error", error: "password-update-failed" };
  }

  return { status: "success" };
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
