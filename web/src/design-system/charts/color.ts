/** Hex or rgb() to rgba() for translucent chart fills. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (hex.startsWith("#")) {
    const raw = hex.slice(1);
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((c) => c + c)
            .join("")
        : raw;
    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return `rgba(93, 134, 71, ${alpha})`;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const parts = hex.match(/rgba?\(([^)]+)\)/);
  if (parts) {
    const [r, g, b] = parts[1].split(",").map((p) => Number.parseFloat(p));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

/** Black or white text for a fill, using WCAG relative luminance. */
export function readableText(color: string): string {
  const hex = color.trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.startsWith("#")) {
    const raw = hex.slice(1);
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const n = Number.parseInt(full, 16);
    if (!Number.isNaN(n)) {
      r = (n >> 16) & 255;
      g = (n >> 8) & 255;
      b = n & 255;
    }
  }
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#14110c" : "#fffaf0";
}
