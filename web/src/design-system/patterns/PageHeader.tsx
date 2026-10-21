import { cn } from "../cn";
import { useStore } from "../../state/store";

export interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  const { lens, catalog, counties } = useStore();
  const lensLabel = catalog?.lenses[lens]?.label ?? lens;
  const eligible = counties.filter((c) => c.scores?.[lens]?.eligible).length;
  const autoDesc = description ?? `${eligible.toLocaleString()} counties ranked for ${lensLabel}. ACS 2020–2024, at least 2,000 residents aged 60+.`;
  return (
    <header className={cn("space-y-1 border-b border-subtle bg-surface1 px-4 py-4 md:px-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-primary">{title}</h1>
          <p className="mt-1 max-w-2xl text-body text-secondary">{autoDesc}</p>
          {meta && <p className="mt-1 text-caption text-tertiary">{meta}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </header>
  );
}
