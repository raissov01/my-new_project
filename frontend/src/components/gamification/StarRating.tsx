"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  stars: number;       // 0-3 earned
  maxStars?: number;   // default 3
  size?: number;
  animate?: boolean;
}

export function StarRating({ stars, maxStars = 3, size = 20, animate = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${stars} of ${maxStars} stars`} role="img">
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={`transition-colors ${
            i < stars
              ? `fill-yellow-400 text-yellow-400 ${animate ? "animate-[pop_0.3s_ease-out]" : ""}`
              : "fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600"
          }`}
          style={animate && i < stars ? { animationDelay: `${i * 150}ms` } : {}}
        />
      ))}
      <style>{`
        @keyframes pop {
          0%  { transform: scale(0.5); }
          60% { transform: scale(1.3); }
          100%{ transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
