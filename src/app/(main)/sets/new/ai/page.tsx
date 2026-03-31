import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { AIGeneratorClient } from "@/components/ai/ai-generator-client";

export default async function AIGeneratorPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AIGeneratorClient />;
}
