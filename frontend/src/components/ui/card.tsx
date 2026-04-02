import { cn } from "@/lib/shared/utils";
import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={cn("ui-panel", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={cn("border-b border-[var(--border)] px-6 py-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: CardProps) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}
