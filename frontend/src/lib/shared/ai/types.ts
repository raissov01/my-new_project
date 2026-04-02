/**
 * Shared AI types — safe to import from both client and server code.
 * Extracted from gemini.ts so client components don't depend on the server module path.
 */

export type GeneratedCard = {
  front: string;
  back: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
};

export type GenerationMode = "generation" | "definition" | "vocabulary";
export type GenerationModeInput =
  | GenerationMode
  | "extraction"
  | "mixed"
  | "qa"
  | "definition";
export type GenerationLanguage = "kk" | "ru" | "en";
