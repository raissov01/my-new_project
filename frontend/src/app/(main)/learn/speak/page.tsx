import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { SpeakClient } from "./client";

export default async function SpeakPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <SpeakClient />;
}
