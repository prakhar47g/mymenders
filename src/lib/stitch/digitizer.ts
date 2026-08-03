// Image -> stitch-unit digitizer.
// Pipeline: sampleImageGrid -> (recipeToStitchOptions) -> gridToUnits. Standard
// image-processing (luminance sampling, Sobel edges, ordered dither, nearest
// palette) mapped onto our stitch-glyph grid.
import { mulberry32, rgbToHex } from "./rng";
import { THREAD } from "./materials";
import type {
  ColorMode,
  ImageStitchConfig,
  PlacedUnit,
  Recipe,
  UnitSource,
} from "./types";

type ImageSource = CanvasImageSource;

/** Rec.709 luminance 0..1 (matches the digitizer's grid sampler). */
const luma709 = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** "#rrggbb" -> [r,g,b] in 0..255. */
function hex255(hex: string): [number, number, number] {
  const e = parseInt(hex.replace("#", ""), 16);
  return [(e >> 16) & 255, (e >> 8) & 255, e & 255];
}

/** Seeded pick from a list (mulberry32). */
function pick<T>(list: T[], seed: number, fallback: T): T {
  if (!list.length) return fallback;
  if (list.length === 1) return list[0];
  return list[Math.floor(mulberry32(seed)() * list.length)];
}

/** Normalize a value against a threshold into 0..1 band position. */
const band = (v: number, threshold: number) =>
  Math.min(1, (v - threshold) / Math.max(0.001, 1 - threshold));

/** 4×4 ordered dither matrix. */
const DITHER = [
  0, 0.5, 2 / 16, 0.625, 0.75, 0.25, 0.875, 6 / 16, 3 / 16, 11 / 16, 1 / 16,
  9 / 16, 15 / 16, 7 / 16, 13 / 16, 5 / 16,
];

export interface SampledGrid {
  cols: number;
  rows: number;
  values: Float32Array;
  colors: string[];
  angles?: Float32Array;
  edges?: Float32Array;
  hues?: Float32Array;
}

interface GridChannels {
  lum: Float32Array;
  alpha: Float32Array;
  colors: string[];
  hues: Float32Array;
}

function makeCanvas(w: number, h: number): CanvasRenderingContext2D {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Downsample an image to a cols×rows grid of luminance/alpha/color/hue. */
function sampleChannels(img: ImageSource, cols: number, rows: number): GridChannels {
  const ctx = makeCanvas(cols, rows);
  ctx.drawImage(img, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const n = cols * rows;
  const lum = new Float32Array(n);
  const alpha = new Float32Array(n);
  const hues = new Float32Array(n);
  const colors: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const a = data[o + 3];
    lum[i] = luma709(r, g, b);
    alpha[i] = a / 255;
    hues[i] = rgbHue(r, g, b);
    colors[i] = rgbToHex(r, g, b);
  }
  return { lum, alpha, colors, hues };
}

function rgbHue(r255: number, g255: number, b255: number): number {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 1e-6) return 0;
  if (max === r) return ((g - b) / d + 6 * (g < b ? 1 : 0)) / 6;
  if (max === g) return ((b - r) / d + 2) / 6;
  return ((r - g) / d + 4) / 6;
}

/** Sobel gradient: per-cell edge magnitude (0..1) and direction (0..1). */
function sobel(values: Float32Array, cols: number, rows: number) {
  const angles = new Float32Array(cols * rows);
  const edges = new Float32Array(cols * rows);
  let max = 1e-6;
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      let sx = 0;
      let sy = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = values[(y + dy) * cols + (x + dx)];
          sx += v * gx[k];
          sy += v * gy[k];
          k++;
        }
      }
      const mag = Math.sqrt(sx * sx + sy * sy);
      const idx = y * cols + x;
      edges[idx] = mag;
      if (mag > max) max = mag;
      angles[idx] = (Math.atan2(sy, sx) / (2 * Math.PI) + 1) % 1;
    }
  }
  for (let i = 0; i < edges.length; i++) edges[i] /= max;
  return { angles, edges };
}

export interface SampleOpts {
  mode: "lum" | "alpha" | "outline";
  detail?: number;
  contrastStretch?: boolean;
  needAngles?: boolean;
  needEdges?: boolean;
  needHue?: boolean;
}

function stretch(v: Float32Array): Float32Array {
  let lo = 1;
  let hi = 0;
  for (const x of v) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  const range = Math.max(1e-6, hi - lo);
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++)
    out[i] = Math.max(0, Math.min(1, (v[i] - lo) / range));
  return out;
}

/** Sample an image into a grid whose `values` are "how much to stitch" (0..1). */
export function sampleImageGrid(
  img: ImageSource,
  cols: number,
  rows: number,
  opts: SampleOpts,
): SampledGrid {
  const ch = sampleChannels(img, cols, rows);
  const raw = new Float32Array(cols * rows);
  for (let i = 0; i < raw.length; i++)
    raw[i] = opts.mode === "alpha" ? ch.alpha[i] : 1 - ch.lum[i];
  const values = opts.contrastStretch ? stretch(raw) : raw;
  const grid: SampledGrid = { cols, rows, values, colors: ch.colors };
  if (opts.needHue) grid.hues = ch.hues;
  if (opts.needAngles || opts.needEdges) {
    const { angles, edges } = sobel(values, cols, rows);
    if (opts.needAngles) grid.angles = angles;
    if (opts.needEdges) grid.edges = edges;
  }
  return grid;
}

/** Median-cut color quantization -> `k` representative thread colors. */
export function extractPalette(img: ImageSource, k = 8, sample = 40): string[] {
  const ctx = makeCanvas(sample, sample);
  ctx.drawImage(img, 0, 0, sample, sample);
  const data = ctx.getImageData(0, 0, sample, sample).data;
  const px: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    px.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!px.length) return ["#141414"];

  let buckets: [number, number, number][][] = [px];
  while (buckets.length < k) {
    // Split the bucket with the largest channel range.
    let bi = -1;
    let bestRange = -1;
    let bestCh = 0;
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (b.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255;
        let hi = 0;
        for (const p of b) {
          if (p[ch] < lo) lo = p[ch];
          if (p[ch] > hi) hi = p[ch];
        }
        const range = hi - lo;
        if (range > bestRange) {
          bestRange = range;
          bi = i;
          bestCh = ch;
        }
      }
    }
    if (bi < 0) break;
    const b = buckets[bi];
    b.sort((a, c) => a[bestCh] - c[bestCh]);
    const mid = b.length >> 1;
    buckets.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }

  const out = buckets
    .filter((b) => b.length)
    .map((b) => {
      let r = 0;
      let g = 0;
      let bl = 0;
      for (const p of b) {
        r += p[0];
        g += p[1];
        bl += p[2];
      }
      const n = b.length;
      return { hex: rgbToHex(r / n, g / n, bl / n), lum: luma709(r / n, g / n, bl / n) };
    });
  out.sort((a, c) => a.lum - c.lum);
  return out.map((o) => o.hex);
}

function avgBorderColor(grid: SampledGrid): [number, number, number] {
  const { cols, rows, colors } = grid;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const add = (idx: number) => {
    const [cr, cg, cb] = hex255(colors[idx]);
    r += cr;
    g += cg;
    b += cb;
    n++;
  };
  for (let c = 0; c < cols; c++) {
    add(c);
    add((rows - 1) * cols + c);
  }
  for (let rr = 1; rr < rows - 1; rr++) {
    add(rr * cols);
    add(rr * cols + cols - 1);
  }
  return [r / n, g / n, b / n];
}

/**
 * Flood-fill background mask from the borders inward. Only cells that are both
 * within `tolerance` of the border color AND connected to the edge are marked
 * — so a light subject in the middle is kept, unlike a naive color key.
 */
export function backgroundMask(grid: SampledGrid, tolerance: number): Uint8Array {
  const { cols, rows, colors } = grid;
  const mask = new Uint8Array(cols * rows);
  const [rr, rg, rb] = avgBorderColor(grid);
  const tol2 = (tolerance * 441.673) ** 2;
  const stack: number[] = [];
  const near = (idx: number) => {
    const [cr, cg, cb] = hex255(colors[idx]);
    return (cr - rr) ** 2 + (cg - rg) ** 2 + (cb - rb) ** 2 < tol2;
  };
  const seed = (idx: number) => {
    if (!mask[idx] && near(idx)) {
      mask[idx] = 1;
      stack.push(idx);
    }
  };
  for (let c = 0; c < cols; c++) {
    seed(c);
    seed((rows - 1) * cols + c);
  }
  for (let r = 0; r < rows; r++) {
    seed(r * cols);
    seed(r * cols + cols - 1);
  }
  while (stack.length) {
    const idx = stack.pop()!;
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    if (c > 0) seed(idx - 1);
    if (c < cols - 1) seed(idx + 1);
    if (r > 0) seed(idx - cols);
    if (r < rows - 1) seed(idx + cols);
  }
  return mask;
}

/** Estimate the background color from the grid's four corners. */
export function estimateBackground(grid: SampledGrid): string {
  const { cols, rows, colors } = grid;
  const corners = [
    colors[0],
    colors[cols - 1],
    colors[(rows - 1) * cols],
    colors[rows * cols - 1],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of corners) {
    const [cr, cg, cb] = hex255(c);
    r += cr;
    g += cg;
    b += cb;
  }
  return rgbToHex(r / 4, g / 4, b / 4);
}

export interface StitchOptions {
  threshold: number;
  invert: boolean;
  /** Flood-fill remove the background (border-connected region). */
  removeBg: boolean;
  /** If set, cells whose sampled color is within `bgTolerance` are skipped. */
  bgKey: string | null;
  bgTolerance: number;
  colorMode: ColorMode;
  monoColor: string;
  palette: string[];
  unitSource: UnitSource;
  unitLight: string;
  unitMid: string;
  unitDark: string;
  randomUnits: string[];
  unitSeed: number;
  unitColors: Record<string, string>;
  paletteImageColors: string[];
  contrastStretch: boolean;
  posterizeLevels: number;
  dither: boolean;
  fillBackground: boolean;
  bgUnits: string[];
  bgColor: string;
  poolsLight: string[];
  poolsMid: string[];
  poolsDark: string[];
}

export function recipeToStitchOptions(
  recipe: Partial<Recipe> & Record<string, unknown>,
  monoColor: string = THREAD.ink,
  palette: string[] = [THREAD.ink, THREAD.red, THREAD.indigo],
): StitchOptions {
  return {
    threshold: recipe.threshold ?? 0.02,
    invert: recipe.invert ?? false,
    removeBg: (recipe.removeBg as boolean) ?? false,
    bgKey: (recipe.bgKey as string | null) ?? null,
    bgTolerance: (recipe.bgTolerance as number) ?? 0.12,
    colorMode: (recipe.colorMode as ColorMode) ?? "sampled",
    monoColor,
    palette,
    unitSource: (recipe.unitSource as UnitSource) ?? "bands",
    unitLight: recipe.unitLight ?? "satin",
    unitMid: recipe.unitMid ?? "cross",
    unitDark: recipe.unitDark ?? "tweed",
    randomUnits: recipe.randomUnits ?? [],
    unitSeed: recipe.unitSeed ?? 11,
    unitColors: recipe.unitColors ?? {},
    paletteImageColors: (recipe.paletteImageColors as string[]) ?? [],
    contrastStretch: (recipe.contrastStretch as boolean) ?? false,
    posterizeLevels: (recipe.posterizeLevels as number) ?? 3,
    dither: (recipe.dither as boolean) ?? false,
    fillBackground: (recipe.fillBackground as boolean) ?? false,
    bgUnits: (recipe.bgUnits as string[]) ?? [],
    bgColor: (recipe.bgColor as string) ?? THREAD.paper,
    poolsLight: (recipe.poolsLight as string[]) ?? [],
    poolsMid: (recipe.poolsMid as string[]) ?? [],
    poolsDark: (recipe.poolsDark as string[]) ?? [],
  };
}

function pickUnit(
  o: StitchOptions,
  grid: SampledGrid,
  value: number,
  idx: number,
  threshold: number,
): string | null {
  const seed = o.unitSeed + 97 * idx + 1;
  switch (o.unitSource) {
    case "random":
      if (!o.randomUnits.length) return o.unitMid;
      return pick(o.randomUnits, seed, o.unitMid);
    case "bandPools": {
      const b = band(value, threshold);
      if (b < 0.33)
        return pick(o.poolsLight.length ? o.poolsLight : [o.unitLight], seed, o.unitLight);
      if (b < 0.66)
        return pick(o.poolsMid.length ? o.poolsMid : [o.unitMid], seed, o.unitMid);
      return pick(o.poolsDark.length ? o.poolsDark : [o.unitDark], seed, o.unitDark);
    }
    case "gradient": {
      const s = grid.angles?.[idx] ?? 0;
      const i = (((360 * s) % 180) + 180) % 180;
      if (i < 30 || i > 150) return o.unitLight;
      if (i > 60 && i < 120) return o.unitMid;
      return o.unitDark;
    }
    case "hue": {
      const i = grid.hues?.[idx] ?? 0;
      if (i < 0.33) return o.unitLight;
      if (i < 0.66) return o.unitMid;
      return o.unitDark;
    }
    case "posterize": {
      const levels = Math.max(1, o.posterizeLevels - 1);
      const s = Math.round(band(value, threshold) * levels) / levels;
      if (s < 0.33) return o.unitLight;
      if (s < 0.66) return o.unitMid;
      return o.unitDark;
    }
    case "edgeFill":
      if ((grid.edges?.[idx] ?? 0) > 0.18) return o.unitLight;
      if (value >= threshold) return o.unitDark;
      return null;
    case "density":
    case "bands":
    default: {
      const b = band(value, threshold);
      if (b < 0.33) return o.unitLight;
      if (b < 0.66) return o.unitMid;
      return o.unitDark;
    }
  }
}

function pickColor(
  o: StitchOptions,
  grid: SampledGrid,
  unit: string,
  idx: number,
  normLuma: Float32Array | null,
): string {
  if (o.colorMode === "mono") return o.monoColor;
  if (o.colorMode === "sampled") return grid.colors[idx];
  if (o.colorMode === "byUnit") return o.unitColors[unit] ?? o.monoColor;
  if (o.colorMode === "paletteImage") {
    if (!o.paletteImageColors.length) return o.monoColor;
    const t = normLuma?.[idx] ?? 0;
    const i = Math.round(t * (o.paletteImageColors.length - 1));
    return o.paletteImageColors[
      Math.max(0, Math.min(o.paletteImageColors.length - 1, i))
    ];
  }
  // palette: nearest color
  const [r, g, b] = hex255(grid.colors[idx]);
  let best = o.palette[0];
  let bestD = Infinity;
  for (const p of o.palette) {
    const [pr, pg, pb] = hex255(p);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Convert a sampled grid into placed stitch units. */
export function gridToUnits(grid: SampledGrid, o: StitchOptions): PlacedUnit[] {
  const out: PlacedUnit[] = [];
  const { cols, rows, values } = grid;

  // For paletteImage color mode: normalized luminance of the sampled colors.
  let normLuma: Float32Array | null = null;
  if (o.colorMode === "paletteImage") {
    const n = grid.colors.length;
    const l = new Float32Array(n);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const [r, g, b] = hex255(grid.colors[i]);
      const c = luma709(r, g, b);
      l[i] = c;
      if (c < lo) lo = c;
      if (c > hi) hi = c;
    }
    const range = Math.max(1e-6, hi - lo);
    for (let i = 0; i < n; i++) l[i] = (l[i] - lo) / range;
    normLuma = l;
  }

  if (o.fillBackground && o.bgUnits.length) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const unit = pick(o.bgUnits, o.unitSeed + 113 * idx + 3, o.bgUnits[0]);
        out.push({ r, c, unit, color: o.bgColor });
      }
  }

  // Background handling: flood-fill mask (keeps light subjects) and/or a
  // global color key (removes all matching cells anywhere).
  const bgm = o.removeBg ? backgroundMask(grid, o.bgTolerance) : null;
  const bg = o.bgKey ? hex255(o.bgKey) : null;
  const bgTol2 = (o.bgTolerance * 441.673) ** 2; // 441.67 = max rgb distance

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (bgm && bgm[idx]) continue;
      if (bg) {
        const [cr, cg, cb] = hex255(grid.colors[idx]);
        const d = (cr - bg[0]) ** 2 + (cg - bg[1]) ** 2 + (cb - bg[2]) ** 2;
        if (d < bgTol2) continue;
      }
      let g = values[idx];
      if (o.invert) g = 1 - g;
      const th = o.dither
        ? o.threshold + (DITHER[(3 & r) * 4 + (3 & c)] - 0.5) * 0.28
        : o.threshold;
      if (o.unitSource !== "edgeFill" && g < th) continue;
      const unit = pickUnit(o, grid, g, idx, o.threshold);
      if (!unit) continue;
      out.push({ r, c, unit, color: pickColor(o, grid, unit, idx, normLuma) });
    }
  }
  return out;
}

export const IMAGE_STITCH_CONFIG_VERSION = 1;

export interface BuildConfigInput {
  name: string;
  cols: number;
  rows: number;
  cell?: number;
  insetPct: number;
  style: ImageStitchConfig["style"];
  anim: ImageStitchConfig["anim"];
  units: PlacedUnit[];
  recipe?: Recipe;
}

export function buildImageStitchConfig(t: BuildConfigInput): ImageStitchConfig {
  return {
    version: IMAGE_STITCH_CONFIG_VERSION,
    name: t.name,
    cols: t.cols,
    rows: t.rows,
    cell: t.cell ?? 16,
    insetPct: t.insetPct,
    style: t.style,
    anim: t.anim,
    units: t.units,
    ...(t.recipe ? { recipe: t.recipe } : {}),
  };
}

/** Compute grid dims for an image at a target resolution, preserving aspect. */
export function gridDimsFor(
  imgW: number,
  imgH: number,
  resolution: number,
): { cols: number; rows: number } {
  const ratio = imgW / imgH || 1;
  let cols = resolution;
  let rows = Math.max(1, Math.round(resolution / ratio));
  if (ratio >= 1) {
    cols = resolution;
    rows = Math.max(1, Math.round(resolution / ratio));
  } else {
    rows = resolution;
    cols = Math.max(1, Math.round(resolution * ratio));
  }
  return { cols, rows };
}
