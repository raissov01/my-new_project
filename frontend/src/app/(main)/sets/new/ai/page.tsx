import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/supabase/server";
import { AIGeneratorClient } from "@/features/ai/components/ai-generator-client";

export default async function AIGeneratorPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AIGeneratorClient />;
}
