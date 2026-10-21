/**
 * Motion tokens (B.7). Durations mirror the CSS variables so JS-driven motion
 * (drawer springs, count-ups) stays consistent with CSS transitions.
 */
export const dur = {
  fast: 120,
  base: 180,
  slow: 280,
  hero: 600,
} as const;

export const ease = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;

export const spring = { stiffness: 300, damping: 30 } as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** List entrances stagger at 24 ms and cap at 12 items (B.7). */
export function staggerDelay(index: number): number {
  return Math.min(index, 12) * 24;
}
