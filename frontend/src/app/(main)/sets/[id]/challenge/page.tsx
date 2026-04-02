import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getSetDetail } from "@/server/services/sets";
import { ChallengeClient } from "./client";

interface ChallengePageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { id } = await params;
  const t = createTranslator(await getServerLocale());
  const setDetail = await getSetDetail(id, "anonymous");
  const set = setDetail
    ? {
        id: setDetail.id,
        title: setDetail.title,
        description: setDetail.description,
        is_public: setDetail.isPublic,
      }
    : null;
  const flashcards = setDetail?.flashcards ?? [];

  if (!set || flashcards.length === 0) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/sets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("challenge.backToSet")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {set.is_public ? t("challenge.publicChallenge") : t("challenge.privateChallenge")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          {set.title}
        </h1>
        {set.description && (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            {set.description}
          </p>
        )}
      </div>

      <div className="mt-8">
        <ChallengeClient
          flashcards={flashcards}
          setId={id}
          rankingHref={`/sets/${id}/ranking`}
        />
      </div>
    </div>
  );
}
