import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getFriends } from "@/features/gamification/api";
import { InviteCodeCard } from "@/components/gamification/InviteCodeCard";
import { FriendList } from "@/components/gamification/FriendList";

export const metadata = { title: "Friends — StudyWithRaissov" };

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getFriends();
  const friendCount = data?.friends?.length ?? 0;

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>Friends</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {friendCount} {friendCount === 1 ? "friend" : "friends"}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {data?.inviteCode && (
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px" }}>
            <InviteCodeCard code={data.inviteCode} />
          </div>
        )}

        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px" }}>
          <FriendList
            friends={data?.friends ?? []}
            pendingRequests={data?.pendingRequests ?? []}
          />
        </div>
      </div>
    </div>
  );
}
