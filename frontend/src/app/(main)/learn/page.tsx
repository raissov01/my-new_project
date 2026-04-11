import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getPlacement } from "@/features/learn/api";

export default async function LearnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const placement = await getPlacement();

  if (!placement) {
    redirect("/learn/placement");
  }

  redirect("/learn/map");
}
