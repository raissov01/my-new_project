export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div>
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-7 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-4 h-12 w-80 animate-pulse rounded-2xl bg-[var(--border)]" />
            <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-6 flex gap-3">
              <div className="h-11 w-40 animate-pulse rounded-xl bg-[var(--border)]" />
              <div className="h-11 w-36 animate-pulse rounded-xl bg-[var(--border)]" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)]"
              />
            ))}
          </div>

          <div className="mt-6 h-64 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)]" />
          <div className="mt-6 h-[34rem] animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)]" />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)]"
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-96 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)]" />
        </div>
      </div>
    </div>
  );
}
