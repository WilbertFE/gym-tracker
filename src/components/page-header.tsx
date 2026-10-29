type PageHeaderProps = {
  label: string;
  title: string;
  description?: string;
};

/** Shared page heading: small uppercase label, single h1, optional description. */
export function PageHeader({ label, title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-primary/30 pb-4">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        [ {label} ]
      </p>
      <h1 className="text-2xl font-semibold tracking-wide">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
