// The stitch-glyph vocabulary. Each unit is a set of legs (straight thread
// segments) in normalized [0..1] cell space — crosses, weaves, satins, and a
// few motif fills built from polygon outlines + scanline fills.
import type { NormLeg, Unit } from "./types";

const round5 = (e: number) => Math.round(1e5 * e) / 1e5;

function leg(
  a: [number, number],
  b: [number, number],
  pinned = false,
): NormLeg {
  const l = [a, b] as NormLeg;
  if (pinned) l.pinned = true;
  return l;
}

/** hatchH: `e` horizontal rows, boustrophedon (alternating direction). */
function rows(e: number): NormLeg[] {
  const out: NormLeg[] = [];
  for (let r = 0; r < e; r++) {
    const n = (r + 0.5) / e;
    out.push(r % 2 ? leg([1, n], [0, n]) : leg([0, n], [1, n]));
  }
  return out;
}

/** hatchV: `e` vertical columns, alternating direction. */
function cols(e: number): NormLeg[] {
  const out: NormLeg[] = [];
  for (let r = 0; r < e; r++) {
    const n = (r + 0.5) / e;
    out.push(r % 2 ? leg([n, 1], [n, 0]) : leg([n, 0], [n, 1]));
  }
  return out;
}

/** Diagonal fill of `2e-1` legs, clipped to the cell corners (the taper look). */
function diag(e: number, dir: "/" | "\\"): NormLeg[] {
  const out: NormLeg[] = [];
  const n = 2 * e - 1;
  for (let i = 1; i <= n; i++) {
    const o = i / (n + 1);
    const lo = Math.max(0, 2 * o - 1);
    const hi = Math.min(1, 2 * o);
    out.push(
      dir === "/" ? leg([lo, hi], [hi, lo]) : leg([lo, lo], [hi, hi]),
    );
  }
  return out;
}

/** weave: horizontal rows woven with vertical columns. */
function weave(e: number): NormLeg[] {
  return [...rows(e), ...cols(e)];
}

/** Outline legs connecting consecutive points (wrapping). Marked pinned. */
function outline(pts: [number, number][]): NormLeg[] {
  return pts.map((t, r) => {
    const o = pts[(r + 1) % pts.length];
    return leg([t[0], t[1]], [o[0], o[1]], true);
  });
}

/** Polygon scanline fill: `count` horizontal legs across the shape interior. */
function scanFill(pts: [number, number][], count: number): NormLeg[] {
  const ys = pts.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const out: NormLeg[] = [];
  for (let r = 0; r < count; r++) {
    const y = minY + ((maxY - minY) * (r + 0.5)) / count;
    const xs: number[] = [];
    for (let t = 0; t < pts.length; t++) {
      const a = pts[t];
      const b = pts[(t + 1) % pts.length];
      const ya = a[1];
      const yb = b[1];
      if ((ya <= y && yb > y) || (yb <= y && ya > y)) {
        xs.push(a[0] + ((b[0] - a[0]) * (y - ya)) / (yb - ya));
      }
    }
    xs.sort((a, b) => a - b);
    const yy = round5(y);
    for (let e = 0; e + 1 < xs.length; e += 2) {
      out.push(leg([round5(xs[e]), yy], [round5(xs[e + 1]), yy]));
    }
  }
  return out;
}

// --- shape point sets ---
const circlePts: [number, number][] = (() => {
  const e: [number, number][] = [];
  for (let t = 0; t < 18; t++) {
    const r = (t / 18) * Math.PI * 2;
    e.push([round5(0.5 + 0.42 * Math.cos(r)), round5(0.5 + 0.42 * Math.sin(r))]);
  }
  return e;
})();

const diamondPts: [number, number][] = [
  [0.5, 0.05],
  [0.95, 0.5],
  [0.5, 0.95],
  [0.05, 0.5],
];

const leafPts: [number, number][] = [
  [0.5, 0.05],
  [0.85, 0.35],
  [0.7, 0.75],
  [0.5, 0.95],
  [0.3, 0.75],
  [0.15, 0.35],
];

function heartPts(): [number, number][] {
  const e: [number, number][] = [];
  for (let t = 0; t < 22; t++) {
    const r = (t / 22) * Math.PI * 2;
    const n = 16 * Math.pow(Math.sin(r), 3);
    const o =
      13 * Math.cos(r) -
      5 * Math.cos(2 * r) -
      2 * Math.cos(3 * r) -
      Math.cos(4 * r);
    e.push([round5(0.5 + n / 38), round5(0.5 - o / 34)]);
  }
  return e;
}

function starPts(): [number, number][] {
  const e: [number, number][] = [];
  for (let t = 0; t < 10; t++) {
    const r = -Math.PI / 2 + (t / 10) * Math.PI * 2;
    const n = t % 2 ? 0.18 : 0.45;
    e.push([round5(0.5 + Math.cos(r) * n), round5(0.5 + Math.sin(r) * n)]);
  }
  return e;
}

function sunburst(): NormLeg[] {
  const e: NormLeg[] = [];
  for (let t = 0; t < 12; t++) {
    const r = (t / 12) * Math.PI * 2;
    e.push(
      leg([0.5, 0.5], [round5(0.5 + 0.45 * Math.cos(r)), round5(0.5 + 0.45 * Math.sin(r))]),
    );
  }
  return e;
}

export const UNITS: Record<string, Unit> = {
  cross: { name: "Cross", legs: [leg([0, 1], [1, 0]), leg([0, 0], [1, 1])] },
  slash: { name: "Slash", legs: [leg([0, 1], [1, 0])] },
  back: { name: "Back", legs: [leg([0, 0], [1, 1])] },
  vert: { name: "Upright", legs: [leg([0.5, 0], [0.5, 1])] },
  horiz: { name: "Bar", legs: [leg([0, 0.5], [1, 0.5])] },
  half: { name: "Half", legs: [leg([0, 1], [1, 1]), leg([1, 1], [1, 0])] },
  box: {
    name: "Box",
    legs: [
      leg([0.12, 0.12], [0.88, 0.12]),
      leg([0.88, 0.12], [0.88, 0.88]),
      leg([0.88, 0.88], [0.12, 0.88]),
      leg([0.12, 0.88], [0.12, 0.12]),
    ],
  },
  vee: { name: "Vee", legs: [leg([0, 0], [0.5, 1]), leg([0.5, 1], [1, 0])] },
  plus: { name: "Plus", legs: [leg([0.5, 0], [0.5, 1]), leg([0, 0.5], [1, 0.5])] },
  weave3: { name: "Weave 3×3", legs: weave(3) },
  weave5: { name: "Weave 5×5", legs: weave(5) },
  hatchH: { name: "Rows", legs: rows(6) },
  hatchV: { name: "Columns", legs: cols(6) },
  hatchR: { name: "Hatch /", legs: diag(4, "/") },
  hatchL: { name: "Hatch \\", legs: diag(4, "\\") },
  crossH: { name: "Cross-hatch", legs: [...diag(4, "/"), ...diag(4, "\\")] },
  satin: { name: "Satin fill", legs: diag(7, "/") },
  tweed: { name: "Tweed", legs: [...rows(3), ...diag(3, "/"), ...diag(3, "\\")] },
  circleFill: {
    name: "Circle",
    legs: [...outline(circlePts), ...scanFill(circlePts, 12)],
  },
  diamondFill: {
    name: "Diamond",
    legs: [...outline(diamondPts), ...scanFill(diamondPts, 10)],
  },
  heartFill: {
    name: "Heart",
    legs: [...outline(heartPts()), ...scanFill(heartPts(), 12)],
  },
  starFill: {
    name: "Star",
    legs: [...outline(starPts()), ...scanFill(starPts(), 11)],
  },
  leaf: { name: "Leaf", legs: [...outline(leafPts), ...scanFill(leafPts, 10)] },
  sunburst: { name: "Sunburst", legs: sunburst() },
  dot: {
    name: "Dot",
    legs: [leg([0.38, 0.5], [0.62, 0.5]), leg([0.5, 0.38], [0.5, 0.62])],
  },
};

export const UNIT_KEYS = [
  "cross", "slash", "back", "vert", "horiz", "half", "box", "vee", "plus",
];
export const CLOTH_KEYS = [
  "weave3", "weave5", "hatchH", "hatchV", "hatchR", "hatchL", "crossH", "satin", "tweed",
];
export const CREATIVE_KEYS = [
  "circleFill", "diamondFill", "heartFill", "starFill", "leaf", "sunburst",
];
export const ALL_UNIT_KEYS = [...UNIT_KEYS, ...CLOTH_KEYS, ...CREATIVE_KEYS];

export const CELL_SIZE = 16;
export const CELL_INSET = 0;

/** A motif unit has pinned outline legs -> reduced physics + fill treatment. */
export function isMotifUnit(unit: string): boolean {
  return UNITS[unit]?.legs.some((l) => l.pinned) ?? false;
}

/** A dense unit has many legs (thinner threads, no needle marker). */
export function isDense(unit: string): boolean {
  return (UNITS[unit]?.legs.length ?? 0) > 4;
}
