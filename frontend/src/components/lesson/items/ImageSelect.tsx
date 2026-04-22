"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ImageSelectItem } from "@/types/lesson";

interface Props {
  item: ImageSelectItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function ImageSelect({ item, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;

  function handleSelect(optId: string) {
    if (answered) return;
    const correct = optId === item.correctOptionId;
    setSelected(optId);
    onAnswer(correct, optId);
  }

  return (
    <div>
      <p className="mb-4 text-base font-semibold text-[var(--text-primary)]">
        {item.prompt}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {item.options.map((opt) => {
          let borderCls =
            "border-[var(--border)] hover:border-[var(--primary)]";
          if (answered) {
            if (opt.id === item.correctOptionId)
              borderCls = "border-emerald-500 ring-2 ring-emerald-500/30";
            else if (opt.id === selected)
              borderCls = "border-red-500 ring-2 ring-red-500/30";
          }
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={answered}
              aria-label={opt.alt}
              className={`relative overflow-hidden rounded-xl border-2 transition-all active:scale-95 ${borderCls}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opt.imageUrl}
                alt={opt.alt}
                loading="lazy"
                className="aspect-square w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='%23f1f5f9'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='13' fill='%2394a3b8'>${encodeURIComponent(opt.alt)}</text></svg>`;
                }}
              />
              {answered && opt.id === item.correctOptionId && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </span>
              )}
              {answered &&
                opt.id === selected &&
                opt.id !== item.correctOptionId && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                    <XCircle className="h-4 w-4 text-white" />
                  </span>
                )}
              <p className="p-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                {opt.alt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
