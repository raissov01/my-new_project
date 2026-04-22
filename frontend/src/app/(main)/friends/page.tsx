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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friends</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.friends?.length ?? 0} friend{(data?.friends?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {data?.inviteCode && <InviteCodeCard code={data.inviteCode} />}

        <FriendList
          friends={data?.friends ?? []}
          pendingRequests={data?.pendingRequests ?? []}
        />
      </div>
    </main>
  );
}
