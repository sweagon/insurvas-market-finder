import { Link } from "react-router-dom";
import { ChevronRight } from "../icons";

export interface Crumb {
  label: string;
  to?: string;
}

/** Breadcrumb (design §C.1). The last item is the current page and is not a link. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-caption text-tertiary">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="rounded px-0.5 hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-secondary" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight size={12} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
