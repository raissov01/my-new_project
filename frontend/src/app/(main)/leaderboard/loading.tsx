export default function LeaderboardLoading() {
  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/* Hero header */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded-2xl bg-[var(--border)]" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded-full bg-[var(--border)]" />
      </div>

      {/* Challenge cards grid */}
      <div className="mt-8 rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="mt-2 h-7 w-48 animate-pulse rounded-xl bg-[var(--border)]" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 animate-pulse rounded-lg bg-[var(--border)]" />
                  <div className="h-3.5 w-full animate-pulse rounded-full bg-[var(--border)]" />
                  <div className="h-3.5 w-5/6 animate-pulse rounded-full bg-[var(--border)]" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
              </div>
              <div className="mt-4 h-3.5 w-32 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-5 flex gap-3">
                <div className="h-10 w-36 animate-pulse rounded-xl bg-[var(--border)]" />
                <div className="h-10 w-32 animate-pulse rounded-xl bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
