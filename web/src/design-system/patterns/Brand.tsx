import { cn } from "../cn";

const SRC = {
  "logo-dark": "/assets/logo-dark.webp",
  "logo-light": "/assets/logo-light.webp",
  "mark-dark": "/assets/logo-mark-dark.webp",
  "mark-light": "/assets/logo-mark-light.webp",
} as const;

/**
 * The wordmark with theme-correct ink.
 *
 * `tone` describes the surface, not the site theme: the sidebar can stay dark
 * in light mode, so the caller decides which asset has contrast. Assets are
 * derived from the single source PNG by `make brand` (see
 * scripts/derive_brand_assets.py).
 */
export function Brand({
  tone = "dark",
  variant = "full",
  className,
  alt = "Insurvas",
}: {
  tone?: "dark" | "light";
  variant?: "full" | "mark";
  className?: string;
  alt?: string;
}) {
  const key = `${variant === "mark" ? "mark" : "logo"}-${tone}` as keyof typeof SRC;
  const [w, h] = variant === "mark" ? [256, 256] : [1232, 174];
  return (
    <img
      src={SRC[key]}
      alt={alt}
      width={w}
      height={h}
      decoding="async"
      className={cn(variant === "mark" ? "h-8 w-8" : "h-5 w-auto", className)}
    />
  );
}
