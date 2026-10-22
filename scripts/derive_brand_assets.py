"""Derive theme-correct brand assets from the single source wordmark.

The design system ships one wordmark (`web/public/assets/logo.png`) on
transparent green ink. It is too light for white paper and too dark for the
near-black canvas, and a 4.4:1 wordmark is not a usable favicon.

This script analyses the source ink (hue, lightness range, first isolated
glyph cluster) and writes:

- ``logo-dark.webp`` / ``logo-light.webp`` - full wordmark tuned for each surface
- ``logo-mark-*.webp`` - the first square glyph cluster, for compact shells
- ``favicon-{32,192,512}.png``, ``apple-touch-icon-180.png`` - green tile + mark
- ``og-image.png`` - 1200x630 social card

Run ``make brand`` after replacing the source logo. The output is deterministic,
so a changed file in review means the source or this script changed.
"""

from __future__ import annotations

import colorsys
import statistics
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "web" / "public" / "assets"
SOURCE = ASSETS / "logo.png"

DARK_BG = (12, 11, 10)
LIGHT_BG = (242, 240, 236)
ACCENT = (93, 134, 71)
PAPER = (247, 244, 236)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _opaque_pixels(img: Image.Image):
    return [p for p in img.get_flattened_data() if p[3] >= 250]


def _ink_range(img: Image.Image) -> tuple[float, float, float]:
    """Return (min lightness, max lightness, median hue) of the opaque ink."""
    pixels = _opaque_pixels(img)
    lights: list[float] = []
    hues: list[float] = []
    for r, g, b, _ in pixels:
        h, light, _s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        hues.append(h * 360)
        lights.append(light)
    return min(lights), max(lights), statistics.median(hues)


def _recolour(img: Image.Image, lo: float, hi: float, sat_cap: float) -> Image.Image:
    """Map the ink's lightness range onto [lo, hi], preserving hue and shape."""
    src_lo, src_hi, _ = _ink_range(img)
    span = max(src_hi - src_lo, 1e-6)
    out = Image.new("RGBA", img.size)
    src = img.load()
    dst = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            h, light, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            new_light = lo + (light - src_lo) * (hi - lo) / span
            new_light = min(max(new_light, lo), hi)
            rr, gg, bb = colorsys.hls_to_rgb(h, new_light, min(sat, sat_cap))
            dst[x, y] = (round(rr * 255), round(gg * 255), round(bb * 255), a)
    return out


def _save_webp(img: Image.Image, name: str, max_width: int) -> None:
    if img.width > max_width:
        height = round(img.height * max_width / img.width)
        img = img.resize((max_width, height), Image.LANCZOS)
    img.save(ASSETS / name, "WEBP", lossless=True, method=6)
    print(f"wrote {name} {img.size}")


def _first_cluster(img: Image.Image) -> Image.Image:
    """Crop the first isolated glyph run (the square mark) with padding."""
    alpha = img.getchannel("A")
    runs: list[tuple[int, int]] = []
    start: int | None = None
    for x in range(img.width):
        ink = any(alpha.getpixel((x, y)) > 20 for y in range(img.height))
        if ink and start is None:
            start = x
        elif not ink and start is not None:
            runs.append((start, x - 1))
            start = None
    if start is not None:
        runs.append((start, img.width - 1))
    if not runs:
        raise SystemExit("logo.png contains no ink")
    x0, x1 = runs[0]
    box = img.crop((x0, 0, x1 + 1, img.height)).getbbox()
    if box is None:
        raise SystemExit("first glyph cluster is empty")
    mark = img.crop((x0, box[1], x1 + 1, box[3]))
    side = max(mark.size) + round(max(mark.size) * 0.12)
    square = Image.new("RGBA", (side, side))
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
    return square


def _rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def _tile(mark: Image.Image, size: int) -> Image.Image:
    tile = Image.new("RGBA", (size, size), ACCENT)
    inner = round(size * 0.62)
    art = mark.copy()
    art.thumbnail((inner, inner), Image.LANCZOS)
    tile.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
    return _rounded(tile, round(size * 0.22))


def _median_colour(img: Image.Image) -> tuple[int, int, int]:
    pixels = _opaque_pixels(img)
    return tuple(
        round(statistics.median([p[i] for p in pixels])) for i in range(3)
    )  # type: ignore[return-value]


def _contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    def lum(c: tuple[int, int, int]) -> float:
        def channel(v: int) -> float:
            v /= 255
            return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

        return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])

    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _og_image(dark_logo: Image.Image) -> None:
    W, H = 1200, 630
    card = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 0, W, 10), fill=ACCENT)

    logo = dark_logo.copy()
    logo.thumbnail((320, 80), Image.LANCZOS)
    card.paste(logo, (80, 84), logo)

    title_font = ImageFont.truetype(FONT_BOLD, 62)
    sub_font = ImageFont.truetype(FONT_REGULAR, 30)
    small_font = ImageFont.truetype(FONT_REGULAR, 24)

    draw.text((80, 250), "Where senior life-insurance", font=title_font, fill=PAPER)
    draw.text((80, 326), "opportunity lives.", font=title_font, fill=PAPER)
    draw.text(
        (80, 440),
        "3,144 US counties  ·  19 public metrics  ·  uncertainty shown",
        font=sub_font,
        fill=(185, 178, 167),
    )
    draw.text(
        (80, 540),
        "Rank every county for the 60+ market. Pick a lens, see the trade-offs.",
        font=small_font,
        fill=(138, 131, 120),
    )
    card.save(ASSETS / "og-image.png", "PNG", optimize=True)
    print("wrote og-image.png 1200x630")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source wordmark: {SOURCE}")
    ASSETS.mkdir(parents=True, exist_ok=True)
    src = Image.open(SOURCE).convert("RGBA")
    bbox = src.getbbox()
    if bbox is None:
        raise SystemExit("logo.png is fully transparent")
    wordmark = src.crop(bbox)

    # Dark surfaces need a light ink; light surfaces need a dark, high-contrast
    # ink. Hues stay in the brand's green range (measured ~97 degrees).
    dark = _recolour(wordmark, 0.62, 0.90, 0.40)
    light = _recolour(wordmark, 0.20, 0.42, 0.45)

    _save_webp(dark, "logo-dark.webp", 1232)
    _save_webp(light, "logo-light.webp", 1232)

    mark = _first_cluster(src)
    _save_webp(_recolour(mark, 0.66, 0.93, 0.40), "logo-mark-dark.webp", 256)
    _save_webp(_recolour(mark, 0.18, 0.40, 0.45), "logo-mark-light.webp", 256)

    tile_mark = _recolour(mark, 0.90, 0.98, 0.12)
    for size, name in (
        (32, "favicon-32.png"),
        (180, "apple-touch-icon-180.png"),
        (192, "favicon-192.png"),
        (512, "favicon-512.png"),
    ):
        _tile(tile_mark, size).save(ASSETS / name, "PNG", optimize=True)
        print(f"wrote {name} {size}x{size}")

    _og_image(dark)

    print(f"dark ink on canvas contrast: {_contrast(_median_colour(dark), DARK_BG):.2f}:1")
    print(f"light ink on paper contrast: {_contrast(_median_colour(light), LIGHT_BG):.2f}:1")


if __name__ == "__main__":
    main()
