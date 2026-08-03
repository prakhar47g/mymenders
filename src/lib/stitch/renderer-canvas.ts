// Canvas2D renderer — draws each leg as a tapered, sheened stroke along its
// quadratic Bézier. This is the portable fallback for the WebGL renderer.
import { quadPoint, type Leg, type StitchEngine } from "./engine";
import { shade } from "./rng";

export interface CanvasRenderOpts {
  castShadow?: boolean;
  shadowDir?: [number, number];
  shadowOffset?: number;
  background?: string | null;
  dpr?: number;
}

function bezierPoints(leg: Leg, progress: number): [number, number][] {
  const { x0, y0, cxp, cyp, x1, y1 } = leg;
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return [];
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil((len / 4) * p));
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * p;
    pts.push(quadPoint(t, x0, y0, cxp, cyp, x1, y1));
  }
  return pts;
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  color: string,
  width: number,
  alpha: number,
) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Draw the engine's legs onto a 2D context (unscaled world coordinates). */
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  engine: StitchEngine,
  opts: CanvasRenderOpts = {},
) {
  const castShadow = opts.castShadow ?? engine.castShadow;
  const [sdx, sdy] = opts.shadowDir ?? engine.shadowDir;
  const soff = opts.shadowOffset ?? engine.shadowOffset;

  ctx.clearRect(0, 0, engine.W, engine.H);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, engine.W, engine.H);
  }

  // Shadow pass — soft dark silhouette, offset toward the light-relative dir.
  if (castShadow) {
    for (const leg of engine.legs) {
      if (leg.progress <= 0) continue;
      const pts = bezierPoints(leg, leg.progress);
      if (pts.length < 2) continue;
      const off = leg.width * soff;
      const shifted = pts.map(
        ([x, y]) => [x + sdx * off, y + sdy * off] as [number, number],
      );
      strokePath(ctx, shifted, "rgba(18,12,8,1)", leg.width * 1.5, 0.16 * leg.opacity);
    }
  }

  // Thread pass — edge underlay, body, then sheen highlight.
  for (const leg of engine.legs) {
    if (leg.progress <= 0) continue;
    const pts = bezierPoints(leg, leg.progress);
    if (pts.length < 2) continue;
    const mat = leg.material;
    const edgeColor = shade(leg.color, -(1 - mat.edge) * 0.5);

    // Edge underlay: slightly wider, darker rim -> rounded thread look.
    if (mat.edge < 0.999) {
      strokePath(ctx, pts, edgeColor, leg.width, leg.opacity);
      strokePath(ctx, pts, leg.color, leg.width * 0.72, leg.opacity);
    } else {
      strokePath(ctx, pts, leg.color, leg.width, leg.opacity);
    }

    // Sheen: thin lighter core.
    if (mat.sheen > 0.01) {
      const hi = shade(leg.color, mat.sheen * 0.34);
      strokePath(ctx, pts, hi, Math.max(0.6, leg.width * mat.sheenW), mat.sheen * 0.5 * leg.opacity);
    }
  }
  ctx.globalAlpha = 1;
}
