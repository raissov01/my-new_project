import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { ChatClient } from "@/features/chat/components/chat-client";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3 style={{ flex: 1 }}>AI Чат</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            AI Assistant
          </span>
        </div>
      </div>
      <div style={{ height: "calc(100vh - 120px)" }}>
        <ChatClient />
      </div>
    </div>
  );
}
