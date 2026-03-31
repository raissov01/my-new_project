"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
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

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
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

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_current_user_account");

  if (error) {
    redirect("/settings?error=delete-account-failed");
  }

  await supabase.auth.signOut().catch(() => undefined);
  revalidatePath("/dashboard");
  redirect("/login?status=account-deleted");
}
