import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile, getDefaultAppRoute } from "@/lib/supabase/server";
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

  return <ChooseRoleClient />;
}
