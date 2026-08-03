// Render text as a colorful stitched wordmark from a crisp 5×7 bitmap font (see
// pixel-font.ts). Each "on" font cell becomes stitches; colors/units are seeded
// so "Shuffle" gives a fresh confetti. This keeps the letters legible — the
// shapes come from exact cell masks, not a digitized font.
import { buildImageStitchConfig } from "./digitizer";
import { mulberry32 } from "./rng";
import { FONT, GLYPH_W, GLYPH_H } from "./pixel-font";
import type { ImageStitchConfig, PlacedUnit } from "./types";

export const CONFETTI_PALETTE = [
  "#268717", // green
  "#F16A03", // orange
  "#E82D82", // pink
  "#C20D26", // red
  "#2859C0", // blue
  "#FFB73A", // gold
  "#823775", // plum
];

const CONFETTI_UNITS = [
  "box", "satin", "weave3", "weave5", "crossH", "tweed", "hatchH", "hatchV",
  "cross", "plus", "vee",
];

export interface WordmarkOpts {
  seed?: number;
  /** Cells per font pixel — 2 gives chunky, very readable letters. */
  scale?: number;
  cell?: number;
  palette?: string[];
  /** "confetti" = random color per cell; "letters" = one color per letter. */
  colorMode?: "confetti" | "letters";
}

function pick<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

/** Build a stitched wordmark config from arbitrary text. */
export function textToStitchConfig(text: string, opts: WordmarkOpts = {}): ImageStitchConfig {
  const seed = opts.seed ?? 7;
  const scale = opts.scale ?? 2;
  const palette = opts.palette ?? CONFETTI_PALETTE;
  const colorMode = opts.colorMode ?? "confetti";
  const gap = scale; // one font-pixel of space between letters
  const rng = mulberry32(seed);

  const chars = text.toUpperCase().split("");
  const glyphW = GLYPH_W * scale;
  const glyphH = GLYPH_H * scale;
  const cols = chars.length * glyphW + Math.max(0, chars.length - 1) * gap;
  const rows = glyphH;

  const units: PlacedUnit[] = [];
  let cx = 0;
  chars.forEach((ch, li) => {
    const glyph = FONT[ch] ?? FONT[" "];
    const letterColor = palette[li % palette.length];
    for (let r = 0; r < GLYPH_H; r++) {
      const line = glyph[r];
      for (let c = 0; c < GLYPH_W; c++) {
        if (line[c] !== "1") continue;
        for (let sr = 0; sr < scale; sr++) {
          for (let sc = 0; sc < scale; sc++) {
            units.push({
              r: r * scale + sr,
              c: cx + c * scale + sc,
              unit: pick(CONFETTI_UNITS, rng),
              color: colorMode === "letters" ? letterColor : pick(palette, rng),
            });
          }
        }
      }
    }
    cx += glyphW + gap;
  });

  return buildImageStitchConfig({
    name: text,
    cols,
    rows,
    cell: opts.cell ?? 18,
    insetPct: 0.05,
    style: { color: "#141414", width: 1, sheen: true, shadow: true, holes: false },
    anim: { mode: "wave", legDur: 200, stagger: 42, order: "ltr", waveDir: "diag" },
    units,
  });
}
