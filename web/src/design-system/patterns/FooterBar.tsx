import { Link } from "react-router-dom";

/** Slim shell footer: vintage, methodology link and the required source line. */
export function FooterBar() {
  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-subtle bg-surface1 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-caption text-tertiary md:h-control md:flex-nowrap md:px-6 md:py-0 md:pb-0">
      <span className="whitespace-nowrap">ACS 2020–2024 · POPEST 2025</span>
      <Link to="/methodology" className="whitespace-nowrap hover:text-primary">
        <span className="lg:hidden">Methodology</span>
        <span className="hidden lg:inline">Methodology and sources</span>
      </Link>
      <span className="whitespace-nowrap text-tertiary">
        Source: 2026 Insurance Barometer Study, LIMRA and Life Happens
      </span>
    </footer>
  );
}
