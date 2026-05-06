"use client";

import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

const SPLIT_REGEX = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
const DOLLAR_PLACEHOLDER = "__NUET_DOLLAR__";

export function MathText({
  text,
  as = "span",
  className = "whitespace-pre-wrap",
}: {
  text: string;
  as?: "span" | "div";
  className?: string;
}) {
  const safeText = protectCurrencyDollars(text);
  const parts = safeText.split(SPLIT_REGEX).filter(Boolean);
  const Wrapper = as;
  return (
    <Wrapper className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return (
            <BlockMath
              key={`block-${index}`}
              math={part.slice(2, -2)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          return (
            <InlineMath
              key={`inline-dollar-${index}`}
              math={part.slice(1, -1)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return (
            <InlineMath
              key={`inline-paren-${index}`}
              math={part.slice(2, -2)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return (
            <BlockMath
              key={`block-bracket-${index}`}
              math={part.slice(2, -2)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        const restored = restoreCurrencyDollars(part);
        const looseMath = normalizeLooseMath(restored);
        if (looseMath) {
          return (
            <InlineMath
              key={`loose-inline-${index}`}
              math={looseMath}
              renderError={() => <span className="whitespace-pre-wrap">{restored}</span>}
            />
          );
        }
        return <span key={`text-${index}`}>{restored}</span>;
      })}
    </Wrapper>
  );
}

function normalizeLooseMath(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes("\n")) return null;
  if (!/[\\^_√π≤≥±]/.test(trimmed)) return null;

  const withoutLatexCommands = trimmed.replace(/\\[a-zA-Z]+/g, " ");
  const words = withoutLatexCommands.match(/[A-Za-z]{3,}/g) ?? [];
  const allowedWords = new Set(["and", "or", "cm", "kmh", "min", "max", "mm"]);
  if (words.some((word) => !allowedWords.has(word.toLowerCase()))) return null;

  return trimmed
    .replaceAll("√", "\\sqrt")
    .replaceAll("π", "\\pi")
    .replaceAll("≤", "\\leq")
    .replaceAll("≥", "\\geq")
    .replaceAll("−", "-")
    .replaceAll("×", "\\times")
    .replaceAll("÷", "\\div");
}

function protectCurrencyDollars(text: string) {
  return text.replace(/\$(?=\d)/g, DOLLAR_PLACEHOLDER);
}

function restoreCurrencyDollars(text: string) {
  return text.replaceAll(DOLLAR_PLACEHOLDER, "$");
}
