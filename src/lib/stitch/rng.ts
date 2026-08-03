// Seeded RNG (mulberry32) + small colour helpers.

/** mulberry32 — deterministic 32-bit PRNG returning [0,1). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let e = Math.imul(t ^ (t >>> 15), 1 | t);
    e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e;
    return ((e ^ (e >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Stable hash of two ints -> [0,1). Used for seeded per-cell jitter. */
export function hash2(a: number, b: number): number {
  let r = Math.imul(a ^ b, 0x9e3779b1);
  r = Math.imul(r ^ (r >>> 16), 0x85ebca6b);
  r = Math.imul(r ^ (r >>> 13), 0xc2b2ae35);
  return ((r ^ (r >>> 16)) >>> 0) / 0x100000000;
}

/** Deterministic pick from a list given a seed. */
export function seededPick<T>(list: T[], seed: number, fallback: T): T {
  if (!list.length) return fallback;
  const i = Math.floor(mulberry32(seed)() * list.length) % list.length;
  return list[i] ?? fallback;
}

/** "#rrggbb" -> [r,g,b] in 0..1. */
export function hexToRGB(hex: string): [number, number, number] {
  const t = hex.replace("#", "");
  return [
    parseInt(t.slice(0, 2), 16) / 255,
    parseInt(t.slice(2, 4), 16) / 255,
    parseInt(t.slice(4, 6), 16) / 255,
  ];
}

/** [r,g,b] 0..255 -> "#rrggbb". */
export function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Rec.601 luminance of 0..255 rgb, returned 0..1. */
export function luma(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Lighten (t>=0) or darken (t<0) a hex color by fraction t. */
export function shade(hex: string, t: number): string {
  const s = hex.replace("#", "");
  let r = parseInt(s.slice(0, 2), 16);
  let g = parseInt(s.slice(2, 4), 16);
  let b = parseInt(s.slice(4, 6), 16);
  if (t >= 0) {
    r += (255 - r) * t;
    g += (255 - g) * t;
    b += (255 - b) * t;
  } else {
    r *= 1 + t;
    g *= 1 + t;
    b *= 1 + t;
  }
  return rgbToHex(r, g, b);
}

/** Boost saturation/lightness of a hex color (used by colorBoost). */
export function saturateColor(hex: string, sat: number, light: number): string {
  const [r, g, b] = hexToRGB(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const mix = (v: number) => v + (v - l) * (sat - 1);
  let nr = mix(r);
  let ng = mix(g);
  let nb = mix(b);
  const lift = light;
  nr = nr + (1 - nr) * lift;
  ng = ng + (1 - ng) * lift;
  nb = nb + (1 - nb) * lift;
  return rgbToHex(nr * 255, ng * 255, nb * 255);
}
