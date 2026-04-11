import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { ChatClient } from "@/features/chat/components/chat-client";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl">
      <ChatClient />
    </div>
  );
}
