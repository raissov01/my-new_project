interface StudyShellSkeletonProps {
  compact?: boolean;
}

export function StudyShellSkeleton({
  compact = false,
}: StudyShellSkeletonProps) {
  return (
    <div className={`mx-auto ${compact ? "max-w-2xl" : "max-w-3xl"} px-4 py-10 sm:px-6`}>
      <div className="h-4 w-28 animate-pulse rounded-lg bg-[var(--border)]" />
      <div className="mt-4 h-9 w-56 animate-pulse rounded-2xl bg-[var(--border)]" />
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--border)]" />
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="h-3 w-56 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
            </div>
          </div>
          <div className="h-11 w-48 animate-pulse rounded-xl bg-[var(--border)]" />
        </div>
      </div>

      <div className="mt-6 h-36 animate-pulse rounded-2xl bg-[var(--border)]/70" />

      <div className="mt-6 h-12 animate-pulse rounded-xl bg-[var(--border)]" />

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="h-9 w-28 animate-pulse rounded-xl bg-[var(--border)]" />
        <div className="h-9 w-36 animate-pulse rounded-xl bg-[var(--border)]" />
      </div>

      <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm">
        <div className="h-4 w-36 animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-[var(--border)]/80" />
        <div className="mt-6 flex justify-center gap-3">
          <div className="h-11 w-28 animate-pulse rounded-xl bg-[var(--border)]" />
          <div className="h-11 w-28 animate-pulse rounded-xl bg-[var(--border)]" />
          <div className="h-11 w-28 animate-pulse rounded-xl bg-[var(--border)]" />
        </div>
      </div>
    </div>
  );
}
