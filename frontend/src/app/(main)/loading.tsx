export default function MainLoading() {
  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="rounded-[1.9rem] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2.2rem] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="mt-4 h-12 w-full max-w-sm animate-pulse rounded-2xl bg-[var(--border)] sm:h-16" />
            <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="h-11 w-full animate-pulse rounded-2xl bg-[var(--border)] sm:w-44" />
              <div className="h-11 w-full animate-pulse rounded-2xl bg-[var(--border)] sm:w-40" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[1.45rem] border border-[var(--border)] bg-[rgba(255,255,255,0.04)]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--surface-shadow)]"
          />
        ))}
      </section>
    </div>
  );
}
