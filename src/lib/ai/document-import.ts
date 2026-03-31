import type { DocumentImportRequest, GeneratedFlashcardDraft } from "./index";

export type DocumentImportResult = {
  title: string;
  summary: string;
  flashcards: GeneratedFlashcardDraft[];
};

/**
 * Placeholder service boundary for future AI document ingestion.
 * Later this can call OpenAI / queue workers without changing the UI layer.
 */
export async function generateFlashcardsFromDocument(
  _request: DocumentImportRequest
): Promise<DocumentImportResult> {
  throw new Error(
    "AI document import is not enabled yet. Connect Supabase storage and your AI provider first."
  );
}
