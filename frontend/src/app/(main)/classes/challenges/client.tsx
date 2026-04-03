"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { createClassChallenge, createClassGroup } from "./actions";

export function ClassChallengesClient({
  groups,
  sets,
  challenges,
  defaultSetId,
}: {
  groups: { id: string; name: string }[];
  sets: { id: string; title: string }[];
  challenges: {
    id: string;
    title: string;
    groupName: string;
    setTitle: string;
    deadline: string | null;
    joined: boolean;
    isOwner: boolean;
    participantCount: number;
  }[];
  defaultSetId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { t } = useLocale();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-2">
        <form
          action={(formData) =>
            startTransition(async () => {
              await createClassGroup(formData);
            })
          }
          className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
        >
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t("challenge.createGroup")}
          </h2>
          <div className="mt-5 space-y-4">
            <input
              name="name"
              placeholder={t("challenge.className")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <textarea
              name="members"
              rows={5}
              placeholder={t("challenge.studentUsernames")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {t("challenge.createGroupBtn")}
            </button>
          </div>
        </form>

        <form
          action={(formData) =>
            startTransition(async () => {
              await createClassChallenge(formData);
            })
          }
          className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
        >
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t("challenge.createPrivateChallenge")}
          </h2>
          <div className="mt-5 space-y-4">
            <input
              name="title"
              placeholder={t("challenge.challengeTitle")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <select
              name="group_id"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="">{t("challenge.selectGroup")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              name="set_id"
              defaultValue={defaultSetId ?? ""}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="">{t("challenge.assignSet")}</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.title}
                </option>
              ))}
            </select>
            <input
              name="deadline"
              type="datetime-local"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {t("challenge.createChallengeBtn")}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t("challenge.yourChallenges")}
        </h2>
        {challenges.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            {t("challenge.noChallengesYet")}
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {challenge.title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {challenge.groupName} · {challenge.setTitle}
                    </p>
                    {challenge.deadline && (
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {t("challenge.deadline").replace("{date}", new Date(challenge.deadline).toLocaleString())}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-sm text-[var(--text-secondary)]">
                    <p>{t("challenge.joinedCount").replace("{count}", String(challenge.participantCount))}</p>
                    <p>{challenge.isOwner ? t("challenge.teacherOwner") : t("challenge.studentMember")}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/classes/challenges/${challenge.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    {challenge.joined ? t("challenge.openChallenge") : t("challenge.joinChallenge")}
                  </Link>
                  <Link
                    href={`/classes/challenges/${challenge.id}/ranking`}
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)]"
                  >
                    {t("challenge.privateRanking")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
