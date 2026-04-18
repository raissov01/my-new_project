export default function IELTSDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <section className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="h-4 w-4 animate-pulse rounded bg-[var(--border)]" />
            </div>
            <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-[var(--border)]" />
          </div>
        ))}
      </section>

      {/* Roadmap + Band trend */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="h-3.5 w-32 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded-full bg-[var(--border)]" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-3.5 w-28 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
                  <div className="h-2 w-full animate-pulse rounded-full bg-[var(--border)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent writing + speaking */}
      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-3.5 w-32 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]" />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Weakness analysis */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="h-3.5 w-36 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]" />
          ))}
        </div>
      </section>
    </div>
  );
}
