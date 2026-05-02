export function ComingSoon({
  icon: Icon,
  body,
}: {
  icon: React.ElementType;
  body: string;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--text-secondary)]">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-[var(--text-primary)]">Coming soon</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {body}
      </p>
    </section>
  );
}

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header>
      <p className="nd-eyebrow">Admin</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
      )}
    </header>
  );
}
