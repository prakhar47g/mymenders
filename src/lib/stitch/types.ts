// Core data types for the stitch engine.
// Mirrors the library JSON served by the original /api/playground/library.

/** A single thread leg in normalized cell space: [[x0,y0],[x1,y1]] in [0..1]. */
export type NormLeg = [[number, number], [number, number]] & { pinned?: boolean };

/** A named stitch glyph: a set of legs plus a display name. */
export interface Unit {
  name: string;
  legs: NormLeg[];
}

/** Thread material — tunes the renderer (sheen/ply/edge/tint). */
export interface Material {
  name: string;
  widthMul: number;
  sheen: number;
  sheenW: number;
  ply: number;
  plyFreq: number;
  edge: number;
  tint: [number, number, number] | null;
}

/** One stitch placed on the grid. */
export interface PlacedUnit {
  r: number;
  c: number;
  unit: string;
  color: string;
  opacity?: number;
  group?: string;
}

/** A raw satin/SVG thread segment in artwork (viewBox) space. */
export interface ThreadSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  color: string;
  group?: string;
}

export type MotionMode =
  | "together"
  | "coordinated"
  | "ltr"
  | "wave"
  | "uncoordinated"
  | "random";

export type MotionOrder = "ltr" | "spiral" | "diag" | "random";
export type WaveDir = "right" | "left" | "down" | "diag" | "radial";

export interface AnimConfig {
  mode: MotionMode;
  legDur: number;
  stagger: number;
  order?: MotionOrder;
  waveDir?: WaveDir;
}

export interface StyleConfig {
  color: string;
  width: number;
  sheen: boolean;
  shadow: boolean;
  holes: boolean;
}

/** Recipe describing how `units` were generated from a source image. */
export interface Recipe {
  mode: "fill" | "lum" | "alpha" | "outline";
  threshold: number;
  invert?: boolean;
  colorMode: ColorMode;
  detail: number;
  resolution: number;
  unitSource: UnitSource;
  unitLight: string;
  unitMid: string;
  unitDark: string;
  randomUnits: string[];
  unitSeed: number;
  unitColors: Record<string, string>;
  posterizeLevels?: number;
  dither?: boolean;
  [k: string]: unknown;
}

export type ColorMode =
  | "sampled"
  | "mono"
  | "byUnit"
  | "palette"
  | "paletteImage";

export type UnitSource =
  | "bands"
  | "density"
  | "gradient"
  | "hue"
  | "posterize"
  | "edgeFill"
  | "random"
  | "bandPools";

/** Image/grid artwork config (library `images[].config`). */
export interface ImageStitchConfig {
  version: number;
  name: string;
  cols: number;
  rows: number;
  cell: number;
  insetPct: number;
  style: StyleConfig;
  anim: AnimConfig;
  units: PlacedUnit[];
  recipe?: Recipe;
}

/** Satin artwork config (library `satins[].config`). */
export interface SatinStitchConfig {
  version: number;
  name: string;
  vbw: number;
  vbh: number;
  threads: ThreadSegment[];
  pitch: number;
  angleDeg: number;
  thick: number;
  material: string;
}

export interface LibraryItem<T> {
  id: string;
  name: string;
  config: T;
}

export interface Library {
  images: LibraryItem<ImageStitchConfig>[];
  satins: LibraryItem<SatinStitchConfig>[];
  patterns: unknown[];
  faces: unknown[];
}
