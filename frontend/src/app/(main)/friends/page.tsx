import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getFriends } from "@/features/gamification/api";
import { InviteCodeCard } from "@/components/gamification/InviteCodeCard";
import { FriendList } from "@/components/gamification/FriendList";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return { title: `${t("friends.title")} — StudyWithRaissov` };
}

export default async function FriendsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getFriends();
  const friendCount = data?.friends?.length ?? 0;

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("friends.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("friends.count", { n: friendCount })}
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
