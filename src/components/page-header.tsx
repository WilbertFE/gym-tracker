type PageHeaderProps = {
  label: string;
  title: string;
  description?: string;
};

/** Shared page heading: small uppercase label, single h1, optional description. */
export function PageHeader({ label, title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b pb-4">
      <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
