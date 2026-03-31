import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getCurrentProfile,
  getDefaultAppRoute,
  ensureProfile,
} from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { ChooseRoleClient } from "./client";

export default async function ChooseRolePage() {
  if (DEV_MODE) {
    redirect("/student/dashboard");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // If user already has a role, redirect to their dashboard
  const profile = await getCurrentProfile(user);
  if (profile?.role) {
    redirect(getDefaultAppRoute(profile.role));
  }

  const appMetadata =
    "app_metadata" in user && user.app_metadata && typeof user.app_metadata === "object"
      ? (user.app_metadata as { provider?: unknown })
      : null;
  const provider = typeof appMetadata?.provider === "string" ? appMetadata.provider : null;

  if (provider === "google") {
    await ensureProfile(user, "student");
    redirect("/student/dashboard");
  }

  return <ChooseRoleClient />;
}
