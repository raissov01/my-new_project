import Link from "next/link";
import { redirect } from "next/navigation";
import { createClassChallenge } from "@/app/(main)/classes/challenges/actions";
import {
  getAvailableSetsForClassChallenges,
  getMyClassChallenges,
  getOwnedGroups,
} from "@/server/services/class-challenges";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function TeacherChallengesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [groups, sets, challenges] = await Promise.all([
    getOwnedGroups(access.user?.id),
    getAvailableSetsForClassChallenges(access.user?.id),
    getMyClassChallenges(access.user?.id),
  ]);

  const ownedChallenges = challenges.filter((challenge) => challenge.isOwner);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3 style={{ margin: 0 }}>{t("teacher.challengesTitle")}</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--ink-mute)",
            }}
          >
            {ownedChallenges.length} {t("teacher.activeChallenges")}
          </span>
          <Link href="/teacher/classes" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            {t("teacher.openClasses")}
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        className="xl:grid-cols-2"
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "1fr",
          alignItems: "start",
        }}
      >
        {/* Left: Create Challenge Form */}
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: "20px 24px",
            marginBottom: 0,
          }}
        >
          <h3 style={{ margin: "0 0 4px", color: "var(--ink)", fontSize: 18, fontWeight: 600 }}>
            {t("teacher.challengesTitle")}
          </h3>
          <p style={{ margin: "0 0 20px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
            {t("teacher.challengesSubtitle")}
          </p>

          <form
            action={async (formData) => {
              "use server";
              await createClassChallenge(formData);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <Input
              name="title"
              required
              placeholder={t("teacher.challengeTitlePlaceholder")}
            />
            <select
              name="group_id"
              required
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--paper-2)",
                padding: "10px 14px",
                fontSize: 14,
                color: "var(--ink)",
                outline: "none",
              }}
            >
              <option value="">{t("teacher.selectClass")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              name="set_id"
              required
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--paper-2)",
                padding: "10px 14px",
                fontSize: 14,
                color: "var(--ink)",
                outline: "none",
              }}
            >
              <option value="">{t("teacher.selectSet")}</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.title}
                </option>
              ))}
            </select>
            <input
              name="deadline"
              type="datetime-local"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--paper-2)",
                padding: "10px 14px",
                fontSize: 14,
                color: "var(--ink)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <Button type="submit">{t("teacher.createChallenge")}</Button>
          </form>
        </div>

        {/* Right: Active Challenges list */}
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: "20px 24px",
            marginBottom: 0,
          }}
        >
          <h3 style={{ margin: "0 0 4px", color: "var(--ink)", fontSize: 18, fontWeight: 600 }}>
            {t("teacher.activeChallenges")}
          </h3>
          <p style={{ margin: "0 0 16px", color: "var(--ink-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
            {t("teacher.activeChallengesBody")}
          </p>

          {ownedChallenges.length > 0 ? (
            ownedChallenges.map((challenge) => (
              <div
                key={challenge.id}
                style={{
                  background: "var(--paper-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "14px 18px",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>
                      {challenge.title}
                    </div>
                    <div style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 3 }}>
                      {challenge.groupName} &middot; {challenge.setTitle}
                    </div>
                    <div style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
                      {challenge.deadline
                        ? t("teacher.deadlineLabel", {
                            value: new Date(challenge.deadline).toLocaleString(),
                          })
                        : t("teacher.noDeadline")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/classes/challenges/${challenge.id}`}>
                      <Button variant="outline" size="sm">{t("teacher.openChallenge")}</Button>
                    </Link>
                    <Link href={`/classes/challenges/${challenge.id}/ranking`}>
                      <Button size="sm">{t("teacher.viewRanking")}</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                border: "1px dashed var(--line)",
                borderRadius: 14,
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, margin: "0 0 6px" }}>
                {t("teacher.noChallengesTitle")}
              </p>
              <p style={{ color: "var(--ink-mute)", fontSize: 13, margin: 0 }}>
                {t("teacher.noChallengesBody")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
