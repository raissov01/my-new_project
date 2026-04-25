import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getMyClassChallenges } from "@/server/services/class-challenges";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";
import { Button } from "@/components/ui/button";

export default async function StudentChallengesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const challenges = (await getMyClassChallenges(access.user?.id)).filter(
    (challenge) => !challenge.isOwner
  );

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("student.challengesTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)" }}>
            {t("student.challengesEyebrow")}
          </span>
        </div>
      </div>

      <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.7, marginBottom: 20, maxWidth: 620 }}>
        {t("student.challengesSubtitle")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {challenges.length > 0 ? (
          challenges.map((challenge) => (
            <div
              key={challenge.id}
              style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px" }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
                    {challenge.title}
                  </h2>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-mute)" }}>
                    {challenge.groupName} · {challenge.setTitle}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-mute)" }}>
                    {challenge.deadline
                      ? t("student.deadlineLabel", {
                          value: new Date(challenge.deadline).toLocaleString(),
                        })
                      : t("student.noDeadline")}
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Link href={`/classes/challenges/${challenge.id}`}>
                    <Button>{challenge.joined ? t("student.openChallenge") : t("student.joinChallenge")}</Button>
                  </Link>
                  <Link href={`/classes/challenges/${challenge.id}/ranking`}>
                    <Button variant="outline">{t("student.viewClassRanking")}</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            background: "var(--paper)",
            border: "1px dashed var(--line)",
            borderRadius: 18,
            padding: "40px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}>
            <Sparkles style={{ width: 22, height: 22, color: "var(--ink-mute)" }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
              {t("student.noChallengesTitle")}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>
              {t("student.noChallengesBody")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
