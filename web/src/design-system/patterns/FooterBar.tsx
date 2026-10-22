import { Link } from "react-router-dom";

/** Slim shell footer: vintage, methodology link and the required source line. */
export function FooterBar() {
  return (
    <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-subtle bg-surface1 px-4 py-2 text-caption text-tertiary md:px-6">
      <span>ACS 2020–2024 · POPEST 2025</span>
      <Link to="/methodology" className="hover:text-primary">
        Methodology and sources
      </Link>
      <span className="text-tertiary">
        Source: 2026 Insurance Barometer Study, LIMRA and Life Happens
      </span>
    </footer>
  );
}
