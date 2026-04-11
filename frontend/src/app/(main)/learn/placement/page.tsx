import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getPlacement } from "@/features/learn/api";
import { PlacementClient } from "./client";

export default async function PlacementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await getPlacement();
  if (existing) redirect("/learn/map");

  return <PlacementClient />;
}
