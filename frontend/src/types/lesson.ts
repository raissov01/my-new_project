export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface BaseItem {
  id: string;
  level: CEFR;
  prompt?: string;
  topic?: string;
  hint?: string;
  explanation?: string;
}

export interface FillBlankItem extends BaseItem {
  type: "fill_blank";
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

export interface TranslateItem extends BaseItem {
  type: "translate";
  direction: "en_to_kk" | "kk_to_en" | "en_to_ru" | "ru_to_en";
  source: string;
  acceptedAnswers: string[];
}

export interface MatchPairsItem extends BaseItem {
  type: "match_pairs";
  pairs: { left: string; right: string }[];
}

export interface ListenTypeItem extends BaseItem {
  type: "listen_type";
  audioUrl: string;
  acceptedAnswers: string[];
  showHintAfterMistake?: boolean;
}

export interface ImageSelectItem extends BaseItem {
  type: "image_select";
  prompt: string;
  options: { id: string; imageUrl: string; alt: string }[];
  correctOptionId: string;
}

export interface SentenceReorderItem extends BaseItem {
  type: "sentence_reorder";
  tokens: string[];
  correctOrder: number[];
}

export interface WordBuilderItem extends BaseItem {
  type: "word_builder";
  prompt: string;
  letters: string[];
  correctWord: string;
}

export interface ErrorSpotItem extends BaseItem {
  type: "error_spot";
  sentence: string;
  tokens: string[];
  errorTokenIndex: number;
  correction: string;
}

export type LessonItem =
  | FillBlankItem
  | TranslateItem
  | MatchPairsItem
  | ListenTypeItem
  | ImageSelectItem
  | SentenceReorderItem
  | WordBuilderItem
  | ErrorSpotItem;

export interface Lesson {
  id: string;
  title: string;
  level: CEFR;
  topic: string;
  items: LessonItem[];
  xpReward: number;
}
