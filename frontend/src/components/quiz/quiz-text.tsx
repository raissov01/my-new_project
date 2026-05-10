"use client";

import { useMemo } from "react";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

// Quiz-flavoured math renderer. Differs from the NUET MathText in one
// important way: bare $...$ is NOT treated as math, only $$...$$ and
// the LaTeX bracket forms \(...\) / \[...\] are. Currency like "$5" or
// "between $10 and $20" stays as plain text — most quiz authors never
// write inline math, so the cost of mis-rendering currency is real and
// the cost of typing $$ for math is one extra keystroke.
//
// Order in the regex matters: the longer $$...$$ pattern must come
// before the bracket forms so it wins on overlap.
const SPLIT_REGEX = /(\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;

export function QuizText({
  text,
  as = "span",
  className = "whitespace-pre-wrap",
}: {
  text: string | null | undefined;
  as?: "span" | "div";
  className?: string;
}) {
  const safe = text ?? "";
  const parts = useMemo(() => safe.split(SPLIT_REGEX).filter(Boolean), [safe]);
  const Wrapper = as;
  return (
    <Wrapper className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const tex = part.slice(2, -2).trim();
          if (!tex) return part;
          try {
            return <BlockMath key={index} math={tex} />;
          } catch {
            return part;
          }
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          const tex = part.slice(2, -2).trim();
          if (!tex) return part;
          try {
            return <BlockMath key={index} math={tex} />;
          } catch {
            return part;
          }
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          const tex = part.slice(2, -2).trim();
          if (!tex) return part;
          try {
            return <InlineMath key={index} math={tex} />;
          } catch {
            return part;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </Wrapper>
  );
}
