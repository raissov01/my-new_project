import type { LessonItem } from "@/types/lesson";
import { FillBlank } from "./items/FillBlank";
import { Translate } from "./items/Translate";
import { MatchPairs } from "./items/MatchPairs";
import { ListenType } from "./items/ListenType";
import { ImageSelect } from "./items/ImageSelect";
import { SentenceReorder } from "./items/SentenceReorder";
import { WordBuilder } from "./items/WordBuilder";
import { ErrorSpot } from "./items/ErrorSpot";

interface Props {
  item: LessonItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function LessonItemRenderer({ item, onAnswer }: Props) {
  switch (item.type) {
    case "fill_blank":
      return <FillBlank item={item} onAnswer={onAnswer} />;
    case "translate":
      return <Translate item={item} onAnswer={onAnswer} />;
    case "match_pairs":
      return <MatchPairs item={item} onAnswer={onAnswer} />;
    case "listen_type":
      return <ListenType item={item} onAnswer={onAnswer} />;
    case "image_select":
      return <ImageSelect item={item} onAnswer={onAnswer} />;
    case "sentence_reorder":
      return <SentenceReorder item={item} onAnswer={onAnswer} />;
    case "word_builder":
      return <WordBuilder item={item} onAnswer={onAnswer} />;
    case "error_spot":
      return <ErrorSpot item={item} onAnswer={onAnswer} />;
    default: {
      // Exhaustiveness check — TypeScript will error if a new type is added
      // to LessonItem without adding a case here.
      const _exhaustive: never = item;
      return null;
    }
  }
}
