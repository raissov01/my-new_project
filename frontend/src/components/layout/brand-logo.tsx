import Image from "next/image";
import { cn } from "@/lib/shared/utils";

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
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn(
        "relative flex items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--primary),#0ea5e9)] shadow-[0_4px_12px_-4px_rgba(37,99,235,0.4)]",
        compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-9 w-9 sm:h-10 sm:w-10"
      )}>
        <Image
          src="/brand-mark.svg"
          alt="StudyWithRaissov logo"
          width={compact ? 32 : 40}
          height={compact ? 32 : 40}
          className={cn(
            "rounded-[var(--radius-md)]",
            compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-9 w-9 sm:h-10 sm:w-10"
          )}
          priority
        />
      </div>
      {showWordmark ? (
        <div className="min-w-0">
          <p className={cn(
            "truncate font-bold tracking-[-0.03em] text-[var(--text-primary)]",
            compact ? "text-sm" : "text-[15px] sm:text-base"
          )}>
            StudyWithRaissov
          </p>
        </div>
      ) : null}
    </div>
  );
}
