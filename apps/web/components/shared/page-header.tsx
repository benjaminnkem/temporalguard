export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative flex flex-col gap-4 border-b-2 border-dashed border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-1 inline-block -rotate-1 bg-warning-subtle px-2 py-0.5 text-sm font-semibold tracking-[0.08em] text-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-base text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
