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
  const size = compact ? 32 : 40;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand-mark.svg"
        alt="StudyWithRaissov"
        width={size}
        height={size}
        className={cn(
          "shrink-0 rounded-[var(--radius-md)]",
          compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
        )}
        priority
      />
      {showWordmark && (
        <p className={cn(
          "truncate font-bold tracking-[-0.03em] text-[var(--text-primary)]",
          compact ? "text-sm" : "text-[15px] sm:text-base"
        )}>
          StudyWith<span className="text-[#c2500a]">Raissov</span>
        </p>
      )}
    </div>
  );
}
