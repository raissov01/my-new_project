export default function ProfileLoading() {
  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Left — profile card */}
        <div className="space-y-5">
          <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-7">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="h-20 w-20 animate-pulse rounded-full bg-[var(--border)] sm:h-24 sm:w-24" />
              <div className="space-y-2 text-center sm:text-left">
                <div className="h-6 w-36 animate-pulse rounded-lg bg-[var(--border)]" />
                <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--border)]" />
                <div className="h-3.5 w-28 animate-pulse rounded-full bg-[var(--border)]" />
              </div>
            </div>
            {/* XP bar */}
            <div className="mt-5 h-2.5 w-full animate-pulse rounded-full bg-[var(--border)]" />
            {/* Metric cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]" />
              ))}
            </div>
          </div>
        </div>

        {/* Right — activity + achievements */}
        <div className="space-y-5">
          {/* Activity calendar */}
          <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <div className="h-6 w-40 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-sm bg-[var(--border)]" />
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <div className="h-6 w-32 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
