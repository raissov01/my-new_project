import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  showWordmark = true,
  compact = false,
}: {
  className?: string;
  showWordmark?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand-mark.svg"
        alt="StudyWithRaissov logo"
        width={compact ? 32 : 40}
        height={compact ? 32 : 40}
        className={cn(
          "h-8 w-8 rounded-xl border border-white/10 shadow-[0_18px_36px_-24px_rgba(79,124,255,0.72)] sm:h-10 sm:w-10",
          compact && "h-7 w-7 rounded-lg sm:h-8 sm:w-8"
        )}
        priority
      />
      {showWordmark ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[15px]">
            StudyWithRaissov
          </p>
        </div>
      ) : null}
    </div>
  );
}
