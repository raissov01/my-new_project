import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Flashcard, FlashcardSet, StudyProgress } from "@/types/database";

export type UserSetOverview = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  lastStudiedAt: string | null;
  accuracy: number;
  reviewCount: number;
  weakCount: number;
  dueCount: number;
};

function isDueToday(value: string) {
  return new Date(value).getTime() <= Date.now();
}

export async function getUserSetsOverview(): Promise<UserSetOverview[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data: setsData } = await supabase
    .from("flashcard_sets")
    .select("id, title, description, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const sets = (setsData ?? []) as Pick<
    FlashcardSet,
    "id" | "title" | "description" | "created_at" | "updated_at"
  >[];

  if (sets.length === 0) return [];

  // Fetch flashcards + all user progress in parallel (avoids waterfall)
  const setIds = sets.map((set) => set.id);
  const [{ data: flashcardsData }, { data: allProgressData }] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id, set_id, term, definition, position, created_at")
      .in("set_id", setIds),
    supabase
      .from("study_progress")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const flashcards = (flashcardsData ?? []) as Flashcard[];
  const cardsBySet = new Map<string, Flashcard[]>();

  for (const card of flashcards) {
    const existing = cardsBySet.get(card.set_id) ?? [];
    existing.push(card);
    cardsBySet.set(card.set_id, existing);
  }

  // Filter progress in JS to only include cards that belong to owned sets
  const cardIdSet = new Set(flashcards.map((card) => card.id));
  const progress = ((allProgressData ?? []) as StudyProgress[]).filter(
    (row) => cardIdSet.has(row.flashcard_id)
  );
  const progressByCardId = new Map(progress.map((row) => [row.flashcard_id, row]));

  return sets.map((set) => {
    const setCards = cardsBySet.get(set.id) ?? [];
    let totalCorrect = 0;
    let totalAttempts = 0;
    let weakCount = 0;
    let dueCount = 0;
    let lastStudiedAt: string | null = null;

    for (const card of setCards) {
      const row = progressByCardId.get(card.id);
      if (!row) continue;

      totalCorrect += row.times_correct;
      totalAttempts += row.times_correct + row.times_incorrect;

      if (row.is_weak) weakCount += 1;
      if (isDueToday(row.next_review_at)) dueCount += 1;

      if (!lastStudiedAt || row.last_studied_at > lastStudiedAt) {
        lastStudiedAt = row.last_studied_at;
      }
    }

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      createdAt: set.created_at,
      updatedAt: set.updated_at,
      cardCount: setCards.length,
      lastStudiedAt,
      accuracy:
        totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      reviewCount: weakCount + dueCount,
      weakCount,
      dueCount,
    };
  });
}
