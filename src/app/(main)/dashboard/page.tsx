import { redirect } from "next/navigation";
import { getAppHomePath, getCurrentUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(await getAppHomePath(user));
}
