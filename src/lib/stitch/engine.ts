// StitchEngine — the grid / leg / physics core: places stitch glyphs on a grid,
// expands them into thread legs, schedules the stitch-on, and runs a small
// mass-spring cloth simulation each frame.
import { UNITS, isMotifUnit } from "./units";
import { THREADS } from "./materials";
import { hexToRGB, saturateColor } from "./rng";
import { unitDelay, type DelayCtx } from "./scheduling";
import type {
  Material,
  MotionMode,
  MotionOrder,
  PlacedUnit,
  ThreadSegment,
  WaveDir,
} from "./types";

/** Control-point offset factor: motif legs move less than free legs. */
const motifFactor = (motif: boolean) => (motif ? 0.9 : 2);

export interface Node {
  c: number;
  r: number;
  cx: number;
  cy: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  nbr: Node[];
}

export interface Leg {
  uid: string;
  key: string;
  c: number;
  r: number;
  layer: number;
  li: number;
  group?: string;
  node: Node | null;
  a: [number, number];
  b: [number, number];
  mid: [number, number];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Live control point (mid + physics offset), the Bézier control. */
  cxp: number;
  cyp: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  color: string;
  rgb: [number, number, number];
  opacity: number;
  width: number;
  material: Material;
  showNeedle: boolean;
  motifFill: boolean;
  pinned: boolean;
  t0: number;
  t1: number;
  reverse: boolean;
  progress: number;
  drawn: boolean;
  pulled?: boolean;
  removing?: boolean;
}

interface Placement {
  unit: string;
  color: string;
  material: string;
  opacity?: number;
  group?: string;
}

export interface Motion {
  mode: MotionMode;
  order: MotionOrder;
  waveDir: WaveDir;
  stagger: number;
  speed: number;
  loop: boolean;
}

export type PhysicsMode =
  | "cloth"
  | "jelly"
  | "wind"
  | "gravity"
  | "magnet"
  | "ripple";

export interface Physics {
  mode: PhysicsMode;
  spring: number;
  radius: number;
  sway: boolean;
}

export interface FieldWave {
  t: number;
  amp: number;
  freq: number;
  band: number;
  displacement: number;
}

export interface TickResult {
  anyStitching: boolean;
  allDone: boolean;
  punches: number;
  pulls: number;
  drawing: boolean;
  motion: number;
}

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export class StitchEngine {
  cols: number;
  rows: number;
  cell: number;
  pad: number;

  cells = new Map<string, Placement[]>();
  nodes = new Map<string, Node>();
  segments: ThreadSegment[] = [];
  segmentStyle = { material: "cotton", width: 4 };
  legs: Leg[] = [];
  legsRev = 0;

  motion: Motion = {
    mode: "coordinated",
    order: "ltr",
    waveDir: "right",
    stagger: 120,
    speed: 520,
    loop: false,
  };
  physics: Physics = { mode: "cloth", spring: 14, radius: 80, sway: false };
  fieldWave: FieldWave | null = null;

  widthScale = 1;
  inset = 0;
  sheen = true;
  edgeShade = true;
  colorBoost = 0;
  castShadow = true;
  shadowDir: [number, number] = [0.6, 0.8];
  shadowOffset = 1.15;
  shadowSpread = 1.75;
  reducedMotion = false;
  physicsEnabled = true;

  pointer = { x: -9999, y: -9999, down: false, active: false };
  ripples: { x: number; y: number; t0: number }[] = [];
  loopAt: number | null = null;
  physicsIdle = false;
  settled = false;
  private wakeListeners = new Set<() => void>();

  constructor(cols: number, rows: number, cell: number, pad = 6) {
    this.cols = cols;
    this.rows = rows;
    this.cell = cell;
    this.pad = pad;
  }

  get W() {
    return this.cols * this.cell + 2 * this.pad;
  }
  get H() {
    return this.rows * this.cell + 2 * this.pad;
  }

  onWake(fn: () => void) {
    this.wakeListeners.add(fn);
    return () => this.wakeListeners.delete(fn);
  }
  private emitWake() {
    this.settled = false;
    for (const fn of this.wakeListeners) fn();
  }
  wakePhysics() {
    this.physicsIdle = false;
    this.emitWake();
  }
  setFieldWave(w: FieldWave | null) {
    this.fieldWave = w;
    if (w) this.physicsIdle = false;
    this.emitWake();
  }
  isSettled() {
    return this.settled;
  }

  setPointer(x: number, y: number, opts: { down?: boolean; active?: boolean } = {}) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (opts.down !== undefined) this.pointer.down = opts.down;
    if (opts.active !== undefined) this.pointer.active = opts.active;
    if (this.pointer.active && this.physicsEnabled) {
      this.physicsIdle = false;
      this.emitWake();
    }
  }
  releasePointer() {
    this.pointer.down = false;
  }
  clearPointer() {
    this.pointer = { x: -9999, y: -9999, down: false, active: false };
  }

  setGrid(cols: number, rows: number, cell = this.cell) {
    this.cols = cols;
    this.rows = rows;
    this.cell = cell;
    this.segments = [];
    for (const key of [...this.cells.keys()]) {
      const [c, r] = key.split(",").map(Number);
      if (c >= cols || r >= rows) this.cells.delete(key);
    }
    this.nodes.clear();
    for (const key of this.cells.keys()) {
      const [c, r] = key.split(",").map(Number);
      this.ensureNode(c, r);
    }
    this.rebuildLegs();
  }

  clear() {
    this.cells.clear();
    this.nodes.clear();
    this.segments = [];
    this.legs = [];
    this.legsRev++;
    this.ripples = [];
    this.loopAt = null;
    this.emitWake();
  }

  place(c: number, r: number, unit: string, color: string, material: string, group?: string) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
    const key = `${c},${r}`;
    const stack = this.cells.get(key) ?? [];
    const placement: Placement = { unit, color, material, group };
    stack.push(placement);
    this.cells.set(key, stack);
    const node = this.ensureNode(c, r);
    const layer = stack.length - 1;
    this.buildPlacementLegs(key, c, r, node, placement, layer, null, this.legs);
    this.legsRev++;
    this.scheduleUnit(key, layer);
  }

  eraseCell(c: number, r: number) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
    const key = `${c},${r}`;
    if (!this.cells.has(key)) return;
    this.cells.delete(key);
    this.nodes.clear();
    for (const k of this.cells.keys()) {
      const [cc, rr] = k.split(",").map(Number);
      this.ensureNode(cc, rr);
    }
    this.rebuildLegs();
  }

  loadPlaced(
    placed: PlacedUnit[],
    opts: { material?: string; group?: string; clear?: boolean; schedule?: boolean } = {},
  ) {
    const material = opts.material ?? "cotton";
    let prev: Map<string, Node> | null = null;
    if (opts.clear !== false) {
      prev = new Map(this.nodes);
      this.cells.clear();
      this.nodes.clear();
    }
    for (const p of placed) {
      const key = `${p.c},${p.r}`;
      const stack = this.cells.get(key) ?? [];
      stack.push({
        unit: p.unit,
        color: p.color,
        material,
        opacity: p.opacity,
        group: p.group ?? opts.group,
      });
      this.cells.set(key, stack);
      if (Number.isInteger(p.c) && Number.isInteger(p.r)) this.ensureNode(p.c, p.r);
    }
    if (prev) {
      for (const [k, node] of this.nodes) {
        const old = prev.get(k);
        if (old) {
          node.ox = old.ox;
          node.oy = old.oy;
          node.vx = old.vx;
          node.vy = old.vy;
        }
      }
    }
    this.rebuildLegs();
    if (opts.schedule !== false) this.scheduleAll();
  }

  loadSegments(
    segments: ThreadSegment[],
    opts: { material: string; width: number; group?: string; clear?: boolean; schedule?: boolean },
  ) {
    if (opts.clear !== false) {
      this.cells.clear();
      this.nodes.clear();
      this.segments = [];
    }
    this.segmentStyle = { material: opts.material, width: opts.width };
    for (const s of segments) {
      this.segments.push(opts.group ? { ...s, group: s.group ?? opts.group } : s);
    }
    this.rebuildLegs();
    if (opts.schedule !== false) this.scheduleAll();
  }

  cellAt(x: number, y: number): [number, number] {
    return [
      Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.pad) / this.cell))),
      Math.min(this.rows - 1, Math.max(0, Math.floor((y - this.pad) / this.cell))),
    ];
  }

  private matFor(name: string): Material {
    const base = THREADS[name] ?? THREADS.cotton;
    if (this.sheen && this.edgeShade) return base;
    return {
      ...base,
      ...(this.sheen ? {} : { sheen: 0, sheenW: 0 }),
      ...(this.edgeShade ? {} : { edge: 1 }),
    };
  }

  private legColor(color: string): string {
    return this.colorBoost > 0
      ? saturateColor(color, 1 + 2.2 * this.colorBoost, 0.3 * this.colorBoost)
      : color;
  }

  ensureNode(c: number, r: number): Node {
    const key = `${c},${r}`;
    const existing = this.nodes.get(key);
    if (existing) return existing;
    const node: Node = {
      c,
      r,
      cx: this.pad + c * this.cell + this.cell / 2,
      cy: this.pad + r * this.cell + this.cell / 2,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      nbr: [],
    };
    this.nodes.set(key, node);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = this.nodes.get(`${c + dc},${r + dr}`);
      if (n) {
        node.nbr.push(n);
        n.nbr.push(node);
      }
    }
    return node;
  }

  private buildSegmentLegs(prevByUid: Map<string, Leg> | null, out: Leg[]) {
    if (!this.segments.length) return;
    const mat = this.matFor(this.segmentStyle.material);
    const width = this.segmentStyle.width * mat.widthMul * this.widthScale;
    this.segments.forEach((s, n) => {
      const mx = (s.ax + s.bx) / 2;
      const my = (s.ay + s.by) / 2;
      const [c, r] = this.cellAt(mx, my);
      const key = `${c},${r}`;
      const node = this.ensureNode(c, r);
      const uid = `seg|${n}`;
      const prev = prevByUid?.get(uid);
      const ox = prev?.ox ?? node.ox;
      const oy = prev?.oy ?? node.oy;
      out.push({
        uid,
        key,
        c,
        r,
        layer: 1e5 + n,
        li: 0,
        group: s.group,
        node,
        a: [s.ax, s.ay],
        b: [s.bx, s.by],
        mid: [mx, my],
        x0: s.ax,
        y0: s.ay,
        x1: s.bx,
        y1: s.by,
        cxp: mx + 2 * ox,
        cyp: my + 2 * oy,
        ox,
        oy,
        vx: prev?.vx ?? node.vx,
        vy: prev?.vy ?? node.vy,
        color: this.legColor(s.color),
        rgb: hexToRGB(this.legColor(s.color)),
        opacity: 1,
        width,
        material: mat,
        showNeedle: false,
        motifFill: false,
        pinned: false,
        t0: prev?.t0 ?? 0,
        t1: prev?.t1 ?? 0,
        reverse: prev?.reverse ?? false,
        progress: prev?.progress ?? 1,
        drawn: prev?.drawn ?? false,
      });
    });
  }

  buildPlacementLegs(
    key: string,
    c: number,
    r: number,
    node: Node | null,
    placement: Placement,
    layer: number,
    prevByUid: Map<string, Leg> | null,
    out: Leg[],
  ) {
    const unit = UNITS[placement.unit];
    if (!unit) return;
    const mat = this.matFor(placement.material);
    const color = this.legColor(placement.color);
    const gscale = this.cell / 22;
    const legCount = unit.legs.length;
    const width =
      (legCount > 14 ? 2.1 : legCount > 6 ? 3 : 4.4) *
      mat.widthMul *
      gscale *
      this.widthScale;
    const showNeedle = legCount <= 14;
    const motif = isMotifUnit(placement.unit);
    const rgb = hexToRGB(color);
    const inset = this.inset * this.cell;
    const size = this.cell - 2 * inset;

    unit.legs.forEach((l, li) => {
      const ax = this.pad + c * this.cell + inset + l[0][0] * size;
      const ay = this.pad + r * this.cell + inset + l[0][1] * size;
      const bx = this.pad + c * this.cell + inset + l[1][0] * size;
      const by = this.pad + r * this.cell + inset + l[1][1] * size;
      const uid = `${key}|${layer}|${li}`;
      const prev = prevByUid?.get(uid);
      const nodeSrc = !l.pinned && node ? node : null;
      const ox = prev?.ox ?? nodeSrc?.ox ?? 0;
      const oy = prev?.oy ?? nodeSrc?.oy ?? 0;
      const motifFill = motif && !l.pinned;
      const factor = motifFactor(motifFill);
      out.push({
        uid,
        key,
        c,
        r,
        layer,
        li,
        group: placement.group,
        node,
        a: [ax, ay],
        b: [bx, by],
        mid: [(ax + bx) / 2, (ay + by) / 2],
        x0: ax,
        y0: ay,
        x1: bx,
        y1: by,
        cxp: (ax + bx) / 2 + ox * factor,
        cyp: (ay + by) / 2 + oy * factor,
        ox,
        oy,
        vx: prev?.vx ?? nodeSrc?.vx ?? 0,
        vy: prev?.vy ?? nodeSrc?.vy ?? 0,
        color,
        rgb,
        opacity: placement.opacity ?? 1,
        width,
        material: mat,
        showNeedle,
        motifFill,
        pinned: !!l.pinned,
        t0: prev?.t0 ?? 0,
        t1: prev?.t1 ?? 0,
        reverse: prev?.reverse ?? false,
        progress: prev?.progress ?? 1,
        drawn: prev?.drawn ?? false,
      });
    });
  }

  rebuildLegs() {
    const prev = new Map<string, Leg>();
    for (const l of this.legs) prev.set(l.uid, l);
    const out: Leg[] = [];
    this.buildSegmentLegs(prev, out);
    for (const [key, stack] of this.cells) {
      const [c, r] = key.split(",").map(Number);
      const node = this.nodes.get(key) ?? null;
      stack.forEach((placement, layer) => {
        this.buildPlacementLegs(key, c, r, node, placement, layer, prev, out);
      });
    }
    this.legs = out;
    this.legsRev++;
    this.emitWake();
  }

  revealAll() {
    for (const l of this.legs) {
      l.progress = 1;
      l.drawn = true;
      l.t0 = 0;
      l.t1 = 0;
    }
    this.emitWake();
  }

  recolorLegs(fn: (color: string, i: number) => string) {
    this.legs.forEach((l, i) => {
      const c = fn(l.color, i);
      l.color = c;
      l.rgb = hexToRGB(c);
    });
    this.legsRev++;
    this.emitWake();
  }

  // --- scheduling ---

  scheduleAll(t = now(), opts?: { seed?: number; reverse?: boolean }) {
    this.scheduleLegs(this.legs, t, opts);
  }

  scheduleGroup(group: string, t = now(), opts?: { seed?: number; reverse?: boolean }) {
    this.scheduleLegs(
      this.legs.filter((l) => l.group === group),
      t,
      opts,
    );
  }

  scheduleUnit(key: string, layer: number, t = now(), opts?: { seed?: number; reverse?: boolean }) {
    const legs = this.legs.filter((l) => l.key === key && l.layer === layer);
    if (legs.length) this.scheduleLegs(legs, t, opts);
  }

  private scheduleLegs(legs: Leg[], t: number, opts?: { seed?: number; reverse?: boolean }) {
    if (!legs.length) return;
    const groups = new Map<string, Leg[]>();
    for (const l of legs) {
      const gk = `${l.key}|${l.layer}`;
      const g = groups.get(gk) ?? [];
      g.push(l);
      groups.set(gk, g);
    }
    const ctx: DelayCtx = {
      mode: this.motion.mode,
      stagger: this.motion.stagger,
      cols: this.cols,
      rows: this.rows,
      seed: opts?.seed ?? 7,
      order: this.motion.order,
      waveDir: this.motion.waveDir,
    };
    for (const g of groups.values()) {
      const head = g[0];
      const delay = unitDelay({ r: head.r, c: head.c }, ctx);
      const reverse =
        opts?.reverse ??
        ((this.motion.mode === "uncoordinated" || this.motion.mode === "random") &&
          Math.random() < 0.5);
      this.applyStitch(g, t, delay, reverse);
    }
    this.loopAt = null;
    this.emitWake();
  }

  private applyStitch(group: Leg[], t: number, delay: number, reverse: boolean) {
    if (this.reducedMotion) {
      for (const l of group) {
        l.t0 = 0;
        l.t1 = 0;
        l.progress = 1;
        l.drawn = true;
        l.reverse = false;
      }
      return;
    }
    const perLeg = this.motion.speed / Math.max(1, group.length);
    group.forEach((l, i) => {
      l.t0 = t + delay + i * perLeg * 0.75;
      l.t1 = l.t0 + perLeg;
      l.reverse = reverse;
      if (reverse) {
        l.progress = 1;
        l.drawn = true;
        l.pulled = false;
      } else {
        l.progress = 0;
        l.drawn = false;
        l.pulled = true;
        l.ox = l.oy = l.vx = l.vy = 0;
      }
    });
  }

  addRipple(x: number, y: number) {
    if (!this.physicsEnabled) return;
    this.ripples.push({ x, y, t0: now() });
    this.physicsIdle = false;
    this.emitWake();
  }

  // --- physics + frame ---

  physicsStep(): number {
    if (!this.physicsEnabled) {
      this.physicsIdle = true;
      return 0;
    }
    const mode = this.physics.mode;
    const environmental =
      mode === "wind" || this.physics.sway || this.fieldWave !== null;
    const interactive = this.pointer.active || this.ripples.length > 0;
    if (this.physicsIdle && !interactive && !environmental) return 0;

    let damp = 0.86;
    let coupling = 0.14;
    let spring = this.physics.spring / 1000;
    let gravity = 0;
    let magnet = false;
    let wind = 0;
    if (mode === "jelly") {
      damp = 0.94;
      coupling = 0.34;
      spring *= 0.5;
    } else if (mode === "wind") {
      damp = 0.88;
      coupling = 0.2;
      wind = 1;
    } else if (mode === "gravity") {
      damp = 0.9;
      coupling = 0.16;
      gravity = 0.55;
    } else if (mode === "magnet") {
      magnet = true;
    } else if (mode === "ripple") {
      damp = 0.9;
      coupling = 0.22;
    }

    const radius = this.physics.radius;
    const push = this.pointer.down ? 1.9 : 0.55;
    const nodeMax = 0.5 * this.cell;
    const legMax = 0.32 * this.cell;
    const t = now();
    let energy = 0;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (t - this.ripples[i].t0 > 1400) this.ripples.splice(i, 1);
    }

    for (const node of this.nodes.values()) {
      let fx = 0;
      let fy = 0;
      if (this.pointer.active) {
        const dx = node.cx + node.ox - this.pointer.x;
        const dy = node.cy + node.oy - this.pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2) || 1;
          const falloff = 1 - d / radius;
          const f = falloff * falloff * radius * 0.9 * push * (magnet ? -1 : 1);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }
      if (mode === "ripple") {
        for (const rp of this.ripples) {
          const age = (t - rp.t0) / 1400;
          const ringR = age * radius * 2.2;
          const dx = node.cx + node.ox - rp.x;
          const dy = node.cy + node.oy - rp.y;
          const dist = Math.hypot(dx, dy) || 1;
          const band = Math.exp(-(((dist - ringR) / (1.2 * this.cell)) ** 2));
          const amp = (1 - age) * radius * 0.9;
          fx += (dx / dist) * band * amp;
          fy += (dy / dist) * band * amp;
        }
      }
      if (wind > 0) {
        const phase = 0.004 * t - 0.03 * node.cx - 0.01 * node.cy;
        fx += (0.6 * Math.sin(phase) + 0.5) * wind * 2.4;
        fy += Math.sin(1.7 * phase) * wind * 0.9;
      }
      if (gravity > 0) fy += 3 * gravity;
      if (this.physics.sway) {
        fx += 0.25 * Math.sin(0.001 * t + 0.05 * node.cy);
        fy += 0.25 * Math.cos(0.0013 * t + 0.05 * node.cx);
      }
      const fw = this.fieldWave;
      if (fw && mode === "cloth") {
        const u = node.c / Math.max(1, this.cols - 1);
        const v = node.r / Math.max(1, this.rows - 1);
        const s = 0.52 * fw.t;
        const crestA = 0.5 + fw.amp * Math.sin(2 * Math.PI * fw.freq * (u - s));
        const crestB =
          0.5 + fw.amp * Math.sin(2 * Math.PI * fw.freq * (u - s) + Math.PI);
        const prox = Math.max(
          0,
          1 - Math.min(Math.abs(v - crestA), Math.abs(v - crestB)) / fw.band,
        );
        const disp = -(prox * prox * (3 - 2 * prox)) * fw.displacement;
        fx +=
          (Math.cos(2 * Math.PI * fw.freq * (u - s)) * fw.displacement * 0.2 - node.ox) *
          0.28;
        fy += (disp - node.oy) * 0.32;
      }
      if (node.nbr.length > 0) {
        let ax = 0;
        let ay = 0;
        for (const n of node.nbr) {
          ax += n.ox;
          ay += n.oy;
        }
        ax /= node.nbr.length;
        ay /= node.nbr.length;
        fx += (ax - node.ox) * coupling * 40;
        fy += (ay - node.oy) * coupling * 40;
      }
      node.vx = (node.vx + 0.02 * fx - node.ox * spring) * damp;
      node.vy = (node.vy + 0.02 * fy - node.oy * spring) * damp;
      node.ox += node.vx;
      node.oy += node.vy;
      const off = Math.hypot(node.ox, node.oy);
      if (off > nodeMax) {
        const k = nodeMax / off;
        node.ox *= k;
        node.oy *= k;
        node.vx *= 0.5;
        node.vy *= 0.5;
      }
      energy += Math.abs(node.vx) + Math.abs(node.vy);
    }

    for (const leg of this.legs) {
      if (leg.progress <= 0) continue;
      if (leg.drawn && !leg.pinned) {
        const node = leg.node;
        const nx = node ? node.ox : 0;
        const ny = node ? node.oy : 0;
        leg.vx = (leg.vx + (nx - leg.ox) * 0.5) * 0.8;
        leg.vy = (leg.vy + (ny - leg.oy) * 0.5) * 0.8;
        if (this.pointer.active) {
          const mx = leg.mid[0] + leg.ox;
          const my = leg.mid[1] + leg.oy;
          const dx = mx - this.pointer.x;
          const dy = my - this.pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 1;
            const falloff = 1 - d / radius;
            const sign = magnet ? -1 : 1;
            const f = falloff * falloff * push * (leg.motifFill ? 0.35 : 0.9) * sign;
            leg.vx += (dx / d) * f;
            leg.vy += (dy / d) * f;
          }
        }
        leg.ox += leg.vx;
        leg.oy += leg.vy;
        const max = leg.motifFill ? 0.4 * legMax : legMax;
        const off = Math.hypot(leg.ox, leg.oy);
        if (off > max) {
          const k = max / off;
          leg.ox *= k;
          leg.oy *= k;
        }
        energy += Math.abs(leg.vx) + Math.abs(leg.vy);
      }
      const factor = motifFactor(leg.motifFill);
      leg.x0 = leg.a[0];
      leg.y0 = leg.a[1];
      leg.x1 = leg.b[0];
      leg.y1 = leg.b[1];
      leg.cxp = leg.mid[0] + leg.ox * factor;
      leg.cyp = leg.mid[1] + leg.oy * factor;
    }

    const threshold = 0.05 + (this.nodes.size + this.legs.length) * 4e-4;
    this.physicsIdle = !interactive && !environmental && energy < threshold;
    return energy;
  }

  tick(t = now()): TickResult {
    const motion = this.physicsStep();
    let allDone = true;
    let anyStitching = false;
    let punches = 0;
    let pulls = 0;
    let drawing = false;
    for (const leg of this.legs) {
      if (leg.t1 <= leg.t0) {
        leg.progress = 1;
        leg.drawn = true;
        continue;
      }
      let p = (t - leg.t0) / (leg.t1 - leg.t0);
      p = Math.max(0, Math.min(1, p));
      leg.progress = leg.reverse ? 1 - p : p;
      if (p >= 1 && !leg.drawn) {
        leg.drawn = true;
        punches++;
      }
      if (leg.reverse && p >= 1 && !leg.pulled) {
        leg.pulled = true;
        pulls++;
      }
      if (p < 1 && t >= leg.t0) {
        anyStitching = true;
        allDone = false;
        if (!leg.reverse) drawing = true;
      } else if (t < leg.t0) {
        allDone = false;
      }
    }
    const looping = this.motion.loop && !this.reducedMotion;
    if (looping && allDone && this.legs.length) {
      if (this.loopAt == null) this.loopAt = t + 600;
      else if (t >= this.loopAt) {
        this.scheduleAll(t);
        allDone = false;
      }
    } else if (!looping) {
      this.loopAt = null;
    }
    this.settled = allDone && !anyStitching && this.physicsIdle && !looping;
    return { anyStitching, allDone, punches, pulls, drawing, motion };
  }

  dispose() {
    this.wakeListeners.clear();
  }
}

/** Point on a quadratic Bézier — matches the curve() used in the vertex shader. */
export function quadPoint(
  t: number,
  p0x: number,
  p0y: number,
  cx: number,
  cy: number,
  p1x: number,
  p1y: number,
): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0x + 2 * u * t * cx + t * t * p1x,
    u * u * p0y + 2 * u * t * cy + t * t * p1y,
  ];
}
