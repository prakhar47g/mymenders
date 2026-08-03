// Raster -> satin thread generator (our own). Fills a subject with dense
// directional thread segments, colored by the source image — the "satin"
// artwork style. Background is removed by flood fill from the borders so light
// petals inside the subject survive.
import { rgbToHex, luma } from "./rng";
import type { SatinStitchConfig, ThreadSegment } from "./types";

type ImageSource = CanvasImageSource;

export interface SatinizeOpts {
  name?: string;
  /** Thread direction in degrees. */
  angleDeg?: number;
  /** Spacing between thread lines, in working-image pixels. */
  pitch?: number;
  /** Max length of a single thread segment, in pixels. */
  maxLen?: number;
  /** Working resolution (longest side). More = finer, heavier. */
  size?: number;
  /** Pixels lighter than this luminance (0..1) are candidate background. */
  bgCutoff?: number;
  material?: string;
  thick?: number;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * Background mask: flood-fill light pixels connected to the image border. This
 * keeps a light subject interior (e.g. white lotus petals) while dropping the
 * cream/white plate background.
 */
function backgroundMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cutoff: number,
): Uint8Array {
  const bg = new Uint8Array(w * h);
  const light = (idx: number) => {
    const i = idx * 4;
    if (data[i + 3] < 40) return true; // transparent = background
    return luma(data[i], data[i + 1], data[i + 2]) > cutoff;
  };
  const stack: number[] = [];
  const seed = (idx: number) => {
    if (!bg[idx] && light(idx)) {
      bg[idx] = 1;
      stack.push(idx);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0) seed(idx - 1);
    if (x < w - 1) seed(idx + 1);
    if (y > 0) seed(idx - w);
    if (y < h - 1) seed(idx + w);
  }
  return bg;
}

/** Convert a raster image into a satin thread artwork. Browser only. */
export function rasterToSatin(img: ImageSource, opts: SatinizeOpts = {}): SatinStitchConfig {
  const size = opts.size ?? 220;
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
  const scale = size / Math.max(iw, ih);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const bg = backgroundMask(data, w, h, opts.bgCutoff ?? 0.9);
  const inSubject = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    const idx = y * w + x;
    return !bg[idx] && data[idx * 4 + 3] >= 40;
  };

  const theta = ((opts.angleDeg ?? 60) * Math.PI) / 180;
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const px = -dy; // perpendicular (offset direction)
  const py = dx;
  const pitch = opts.pitch ?? 2.4;
  const maxLen = opts.maxLen ?? 5;

  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  const projP = corners.map((c) => c[0] * px + c[1] * py);
  const projD = corners.map((c) => c[0] * dx + c[1] * dy);
  const pMin = Math.min(...projP);
  const pMax = Math.max(...projP);
  const dMin = Math.min(...projD);
  const dMax = Math.max(...projD);

  const threads: ThreadSegment[] = [];
  const emit = (o: number, t0: number, t1: number, cr: number, cg: number, cb: number, n: number) => {
    if (t1 - t0 < 1 || n === 0) return;
    threads.push({
      ax: round1(o * px + t0 * dx),
      ay: round1(o * py + t0 * dy),
      bx: round1(o * px + t1 * dx),
      by: round1(o * py + t1 * dy),
      color: rgbToHex(cr / n, cg / n, cb / n),
    });
  };

  for (let o = pMin; o <= pMax; o += pitch) {
    let start: number | null = null;
    let cr = 0;
    let cg = 0;
    let cb = 0;
    let n = 0;
    for (let t = dMin; t <= dMax; t += 1) {
      const x = Math.round(o * px + t * dx);
      const y = Math.round(o * py + t * dy);
      if (inSubject(x, y)) {
        if (start === null) {
          start = t;
          cr = cg = cb = n = 0;
        }
        const i = (y * w + x) * 4;
        cr += data[i];
        cg += data[i + 1];
        cb += data[i + 2];
        n++;
        if (t - start >= maxLen) {
          emit(o, start, t, cr, cg, cb, n);
          start = t;
          cr = cg = cb = n = 0;
        }
      } else if (start !== null) {
        emit(o, start, t, cr, cg, cb, n);
        start = null;
      }
    }
    if (start !== null) emit(o, start, dMax, cr, cg, cb, n);
  }

  return {
    version: 1,
    name: opts.name ?? "satin",
    vbw: w,
    vbh: h,
    threads,
    pitch: 1,
    angleDeg: opts.angleDeg ?? 60,
    thick: opts.thick ?? 1.7,
    material: opts.material ?? "cotton",
  };
}
