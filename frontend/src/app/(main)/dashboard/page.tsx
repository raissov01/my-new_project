import { redirect } from "next/navigation";
import { getAppHomePath, getCurrentUser } from "@/server/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(await getAppHomePath(user));
}
