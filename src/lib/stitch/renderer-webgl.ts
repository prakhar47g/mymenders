// Shared WebGL renderer. A single GL context + canvas renders any surface's
// legs with instanced draw calls, then the result is blitted onto each
// surface's 2D canvas via drawImage — mirroring the original architecture and
// staying under the browser's per-page WebGL context limit.
import { VERT, FRAG } from "./shaders";
import type { Leg, StitchEngine } from "./engine";

const SEG = 24; // strip segments per leg (curve smoothness)
const FLOATS_PER_INSTANCE = 20;

interface Locs {
  aT: number;
  aSide: number;
  aA: number;
  aB: number;
  aCtrl: number;
  aCol: number;
  aWid: number;
  aProg: number;
  aRev: number;
  aMatA: number;
  aMatB: number;
  uRes: WebGLUniformLocation | null;
  uShadow: WebGLUniformLocation | null;
  uShadowDir: WebGLUniformLocation | null;
  uShadowOff: WebGLUniformLocation | null;
  uShadowSpread: WebGLUniformLocation | null;
}

class SharedGLRenderer {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  gl: WebGLRenderingContext | null = null;
  ext: ANGLE_instanced_arrays | null = null;
  failed = false;
  private prog: WebGLProgram | null = null;
  private loc: Locs | null = null;
  private stripBuf: WebGLBuffer | null = null;
  private instBuf: WebGLBuffer | null = null;
  private instData = new Float32Array(0);

  constructor() {
    this.canvas =
      typeof document !== "undefined"
        ? document.createElement("canvas")
        : (null as never);
    if (!this.canvas) {
      this.failed = true;
      return;
    }
    this.canvas.width = 1;
    this.canvas.height = 1;
    const gl = (this.canvas as HTMLCanvasElement).getContext("webgl", {
      antialias: true,
      premultipliedAlpha: false,
      alpha: true,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;
    if (!gl) {
      this.failed = true;
      return;
    }
    this.gl = gl;
    this.ext = gl.getExtension("ANGLE_instanced_arrays");
    if (!this.ext) {
      this.failed = true;
      return;
    }
    this.build();
  }

  private compile(type: number, src: string): WebGLShader | null {
    const gl = this.gl!;
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  private build() {
    const gl = this.gl!;
    const vs = this.compile(gl.VERTEX_SHADER, VERT);
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      this.failed = true;
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog));
      this.failed = true;
      return;
    }
    this.prog = prog;
    const A = (n: string) => gl.getAttribLocation(prog, n);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    this.loc = {
      aT: A("aT"),
      aSide: A("aSide"),
      aA: A("aA"),
      aB: A("aB"),
      aCtrl: A("aCtrl"),
      aCol: A("aCol"),
      aWid: A("aWid"),
      aProg: A("aProg"),
      aRev: A("aRev"),
      aMatA: A("aMatA"),
      aMatB: A("aMatB"),
      uRes: U("uRes"),
      uShadow: U("uShadow"),
      uShadowDir: U("uShadowDir"),
      uShadowOff: U("uShadowOff"),
      uShadowSpread: U("uShadowSpread"),
    };

    // Base strip: 2*(SEG+1) vertices, aT along, aSide ±1.
    const strip = new Float32Array((SEG + 1) * 2 * 2);
    let k = 0;
    for (let i = 0; i <= SEG; i++) {
      const seg = i / SEG;
      strip[k++] = seg;
      strip[k++] = -1;
      strip[k++] = seg;
      strip[k++] = 1;
    }
    this.stripBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.stripBuf);
    gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW);
    this.instBuf = gl.createBuffer();
  }

  private packInstances(legs: Leg[]): number {
    const need = legs.length * FLOATS_PER_INSTANCE;
    if (this.instData.length < need) this.instData = new Float32Array(need);
    const d = this.instData;
    let o = 0;
    let count = 0;
    for (const l of legs) {
      if (l.progress <= 0) continue;
      const m = l.material;
      const tint = m.tint ?? [0, 0, 0];
      d[o++] = l.x0;
      d[o++] = l.y0;
      d[o++] = l.x1;
      d[o++] = l.y1;
      d[o++] = l.cxp;
      d[o++] = l.cyp;
      d[o++] = l.rgb[0];
      d[o++] = l.rgb[1];
      d[o++] = l.rgb[2];
      d[o++] = l.width;
      d[o++] = l.progress; // aProgress (already reversed by tick())
      d[o++] = l.reverse ? 1 : 0; // aReverse
      d[o++] = m.sheen;
      d[o++] = m.sheenW;
      d[o++] = m.ply;
      d[o++] = m.plyFreq;
      d[o++] = m.edge;
      d[o++] = tint[0];
      d[o++] = tint[1];
      d[o++] = tint[2];
      count++;
    }
    return count;
  }

  private bindInstanceAttribs() {
    const gl = this.gl!;
    const ext = this.ext!;
    const loc = this.loc!;
    const stride = FLOATS_PER_INSTANCE * 4;
    const set = (idx: number, size: number, offsetFloats: number) => {
      if (idx < 0) return;
      gl.enableVertexAttribArray(idx);
      gl.vertexAttribPointer(idx, size, gl.FLOAT, false, stride, offsetFloats * 4);
      ext.vertexAttribDivisorANGLE(idx, 1);
    };
    set(loc.aA, 2, 0);
    set(loc.aB, 2, 2);
    set(loc.aCtrl, 2, 4);
    set(loc.aCol, 3, 6);
    set(loc.aWid, 1, 9);
    set(loc.aProg, 1, 10);
    set(loc.aRev, 1, 11);
    set(loc.aMatA, 4, 12);
    set(loc.aMatB, 4, 16);
  }

  /** Render the engine's legs into the shared GL canvas at wpx×hpx pixels. */
  renderToGL(engine: StitchEngine, wpx: number, hpx: number): HTMLCanvasElement | null {
    if (this.failed || !this.gl || !this.prog || !this.loc) return null;
    const gl = this.gl;
    const ext = this.ext!;
    const loc = this.loc;
    const cv = this.canvas as HTMLCanvasElement;
    if (cv.width !== wpx || cv.height !== hpx) {
      cv.width = wpx;
      cv.height = hpx;
    }
    gl.viewport(0, 0, wpx, hpx);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.prog);

    const count = this.packInstances(engine.legs);
    if (!count) return cv;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.instData.subarray(0, count * FLOATS_PER_INSTANCE),
      gl.DYNAMIC_DRAW,
    );
    this.bindInstanceAttribs();

    // Per-vertex strip attrs (divisor 0).
    gl.bindBuffer(gl.ARRAY_BUFFER, this.stripBuf);
    if (loc.aT >= 0) {
      gl.enableVertexAttribArray(loc.aT);
      gl.vertexAttribPointer(loc.aT, 1, gl.FLOAT, false, 8, 0);
      ext.vertexAttribDivisorANGLE(loc.aT, 0);
    }
    if (loc.aSide >= 0) {
      gl.enableVertexAttribArray(loc.aSide);
      gl.vertexAttribPointer(loc.aSide, 1, gl.FLOAT, false, 8, 4);
      ext.vertexAttribDivisorANGLE(loc.aSide, 0);
    }

    gl.uniform2f(loc.uRes, engine.W, engine.H);
    const vertCount = (SEG + 1) * 2;

    // Shadow pass (optional), then thread pass.
    if (engine.castShadow) {
      gl.uniform1f(loc.uShadow, 1);
      gl.uniform2f(loc.uShadowDir, engine.shadowDir[0], engine.shadowDir[1]);
      gl.uniform1f(loc.uShadowOff, engine.shadowOffset);
      gl.uniform1f(loc.uShadowSpread, engine.shadowSpread);
      ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, vertCount, count);
    }
    gl.uniform1f(loc.uShadow, 0);
    ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, vertCount, count);

    return cv;
  }
}

let shared: SharedGLRenderer | null = null;
export function getSharedGL(): SharedGLRenderer | null {
  if (typeof document === "undefined") return null;
  if (!shared) shared = new SharedGLRenderer();
  return shared.failed ? null : shared;
}

/** Render an engine to a 2D target canvas context via the shared GL renderer. */
export function renderWebGL(
  targetCtx: CanvasRenderingContext2D,
  engine: StitchEngine,
  wpx: number,
  hpx: number,
): boolean {
  const r = getSharedGL();
  if (!r) return false;
  const gl = r.renderToGL(engine, wpx, hpx);
  if (!gl) return false;
  targetCtx.clearRect(0, 0, wpx, hpx);
  targetCtx.drawImage(gl, 0, 0, wpx, hpx);
  return true;
}
