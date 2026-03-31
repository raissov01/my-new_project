import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { Database } from "@/types/database";
import { getAllowedProfilesForSet } from "@/lib/set-access";
import { EditSetClient } from "./client";

interface EditSetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSetPage({ params }: EditSetPageProps) {
  const { id } = await params;
  const t = createTranslator(await getServerLocale());
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Fetch set + flashcards in parallel
  const [{ data }, { data: flashcardData }] = await Promise.all([
    supabase
      .from("flashcard_sets")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("set_id", id)
      .order("position", { ascending: true }),
  ]);
  const set = data as Database["public"]["Tables"]["flashcard_sets"]["Row"] | null;

  if (!set) {
    notFound();
  }

  // Only the owner can edit
  if (set.user_id !== user?.id) {
    redirect(`/sets/${id}`);
  }

  const flashcards =
    flashcardData as Database["public"]["Tables"]["flashcards"]["Row"][] | null;

  const cards = (flashcards ?? []).map((fc) => ({
    id: fc.id,
    term: fc.term,
    definition: fc.definition,
  }));
  const invitedProfiles = await getAllowedProfilesForSet(id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/sets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("set.backToSet")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("set.editSet")}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("set.editSetSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        <EditSetClient
          setId={id}
          initialTitle={set.title}
          initialDescription={set.description ?? ""}
          initialCards={cards}
          initialIsPublic={set.is_public}
          initialInvitedUsers={invitedProfiles.map((profile) => profile.username).join("\n")}
        />
      </div>
    </div>
  );
}
