export type SupportedImportType = "pdf" | "docx";

export type GeneratedFlashcardDraft = {
  term: string;
  definition: string;
  confidence?: number;
};

export type DocumentImportRequest = {
  fileName: string;
  mimeType: string;
  bytes: number;
  sourceType: SupportedImportType;
};

export const AI_FEATURE_FLAGS = {
  documentImport: false,
  flashcardGeneration: false,
} as const;

export function isAIEnabled(flag: keyof typeof AI_FEATURE_FLAGS) {
  return AI_FEATURE_FLAGS[flag];
}
