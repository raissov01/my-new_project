import { redirect } from "next/navigation";
import { getAppHomePath, getCurrentUser, getCurrentRole } from "@/lib/supabase/server";

export default async function ClassChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ setId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { setId } = await searchParams;
  const role = await getCurrentRole(user);

  if (role === "teacher") {
    redirect(setId ? `/teacher/challenges?setId=${encodeURIComponent(setId)}` : "/teacher/challenges");
  }

  if (role === "student") {
    redirect("/student/challenges");
  }

  redirect(await getAppHomePath(user));
}
