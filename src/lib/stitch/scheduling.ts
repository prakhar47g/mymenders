// Per-cell stitch-on delay — the stagger that makes cells animate on in a
// reading order, wave, spiral, or seeded-random pattern.
import { mulberry32 } from "./rng";
import type { MotionMode, MotionOrder, WaveDir } from "./types";

export interface DelayCtx {
  mode: MotionMode;
  stagger: number;
  cols: number;
  rows: number;
  seed: number;
  order?: MotionOrder;
  waveDir?: WaveDir;
}

/** Delay (ms offset) before a cell at (r,c) begins stitching. */
export function unitDelay(cell: { r: number; c: number }, ctx: DelayCtx): number {
  const cx = (ctx.cols - 1) / 2;
  const cy = (ctx.rows - 1) / 2;
  const jitter = () =>
    mulberry32(ctx.seed + 31 * cell.r + 7 * cell.c)() * ctx.stagger * ctx.cols * 0.8;

  switch (ctx.mode) {
    case "together":
      return 0;
    case "uncoordinated":
    case "random":
      return jitter();
    case "wave": {
      const dir = ctx.waveDir ?? "right";
      const f =
        dir === "right"
          ? cell.c
          : dir === "left"
            ? ctx.cols - 1 - cell.c
            : dir === "down"
              ? cell.r
              : dir === "diag"
                ? (cell.r + cell.c) * 0.7
                : 1.2 * Math.hypot(cell.c - cx, cell.r - cy);
      return f * ctx.stagger;
    }
    case "coordinated":
    case "ltr":
    default: {
      const order = ctx.order ?? "ltr";
      if (order === "spiral")
        return Math.hypot(cell.c - cx, cell.r - cy) * ctx.stagger * 1.6;
      if (order === "diag") return (cell.r + cell.c) * ctx.stagger;
      if (order === "random") return jitter();
      return (cell.r * ctx.cols + cell.c) * ctx.stagger * 0.35;
    }
  }
}
