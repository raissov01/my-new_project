import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getPlacement } from "@/features/learn/api";
import { PlacementClient } from "./client";

export default async function PlacementPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const retake = params.retake === "true";

  const existing = await getPlacement();
  if (existing && !retake) redirect("/learn/placement/result");

  return <PlacementClient retake={retake} />;
}
