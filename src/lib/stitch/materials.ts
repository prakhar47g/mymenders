// Thread materials + base palette. Each material tunes the strand shader
// (sheen, ply twist, edge shading, tint).
import type { Material } from "./types";

export const THREAD = {
  ink: "#141414",
  red: "#C20D26",
  indigo: "#2859C0",
  paper: "#faf8f5",
  faint: "#b0aaa0",
} as const;

export const THREADS: Record<string, Material> = {
  cotton: {
    name: "Stranded Cotton",
    widthMul: 1,
    sheen: 0.72,
    sheenW: 0.26,
    ply: 1,
    plyFreq: 0.55,
    edge: 0.42,
    tint: null,
  },
  siteCotton: {
    name: "Site Cotton",
    widthMul: 1,
    sheen: 0.35,
    sheenW: 0.16,
    ply: 0.35,
    plyFreq: 0.45,
    edge: 0.36,
    tint: null,
  },
  heroCotton: {
    name: "Hero Cotton",
    widthMul: 1,
    sheen: 0.56,
    sheenW: 0.24,
    ply: 0.4,
    plyFreq: 0.48,
    edge: 0.32,
    tint: [0.85, 0.9, 1],
  },
  silk: {
    name: "Silk",
    widthMul: 0.95,
    sheen: 0.92,
    sheenW: 0.42,
    ply: 0.25,
    plyFreq: 0.3,
    edge: 0.55,
    tint: null,
  },
  metallic: {
    name: "Metallic",
    widthMul: 0.9,
    sheen: 1,
    sheenW: 0.2,
    ply: 1.4,
    plyFreq: 1.3,
    edge: 0.3,
    tint: [0.85, 0.88, 1],
  },
  pearl: {
    name: "Pearl Cotton",
    widthMul: 1.15,
    sheen: 0.85,
    sheenW: 0.3,
    ply: 1.3,
    plyFreq: 0.7,
    edge: 0.38,
    tint: null,
  },
};

export const THREAD_KEYS = Object.keys(THREADS);
