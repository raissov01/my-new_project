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
          "h-8 w-8 rounded-xl shadow-[0_14px_28px_-16px_rgba(75,107,255,0.95)] sm:h-10 sm:w-10",
          compact && "h-7 w-7 rounded-lg sm:h-8 sm:w-8"
        )}
        priority
      />
      {showWordmark ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-base">
            StudyWithRaissov
          </p>
        </div>
      ) : null}
    </div>
  );
}
