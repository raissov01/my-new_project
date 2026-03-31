export function SetDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-4 w-36 animate-pulse rounded-lg bg-[var(--border)]" />

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <div className="h-10 w-72 animate-pulse rounded-2xl bg-[var(--border)]" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="mt-5 flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-8 w-28 animate-pulse rounded-full bg-[var(--border)]"
            />
          ))}
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-2xl bg-[var(--border)]"
            />
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <div className="h-6 w-40 animate-pulse rounded-xl bg-[var(--border)]" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-[var(--border)]"
                />
              ))}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <div className="h-5 w-32 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-5 h-10 w-36 animate-pulse rounded-xl bg-[var(--border)]" />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="h-6 w-56 animate-pulse rounded-xl bg-[var(--border)]" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-lg bg-[var(--border)]" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-[var(--border)]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
