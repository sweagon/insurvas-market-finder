import { cn } from "../cn";
import { ArrowUpRight, Info } from "../icons";

/** Card (D.3): surface-1, radius 12, 1px border, optional corner link. */
export function Card({
  title,
  info,
  link,
  linkLabel,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  info?: string;
  link?: () => void;
  linkLabel?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-card border border-subtle bg-surface1", className)}>
      {(title || link) && (
        <header className="flex items-center gap-2 border-b border-subtle px-[var(--card-pad)] py-3">
          {title && <h3 className="text-h3 text-primary">{title}</h3>}
          {info && (
            <span className="text-tertiary" title={info} aria-label={info}>
              <Info size={14} aria-hidden />
            </span>
          )}
          {link && (
            <button
              type="button"
              onClick={link}
              aria-label={linkLabel ?? "Open"}
              className="ml-auto rounded-control p-1 text-tertiary hover:bg-surface2 hover:text-primary"
            >
              <ArrowUpRight size={16} aria-hidden />
            </button>
          )}
        </header>
      )}
      <div className={cn("p-[var(--card-pad)]", bodyClassName)}>{children}</div>
    </section>
  );
}
