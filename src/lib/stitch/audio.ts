// Lightweight WebAudio synth for stitch feedback. Reacts to the punch/pull/
// draw/rustle events surfaced by StitchEngine.tick(). Synthesized (no assets).

export class StitchAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastPunch = 0;
  private lastPull = 0;
  private lastDraw = 0;
  private rustleGain: GainNode | null = null;
  volume = 0.5;
  enabled = false;

  /** Must be called from a user gesture to unlock audio. */
  resume() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise();
      this.setupRustle();
    }
    this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noiseSource(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuf;
    return src;
  }

  private setupRustle() {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(bp).connect(g).connect(this.master!);
    src.start();
    this.rustleGain = g;
  }

  /** A needle punching the cloth: filtered noise tick + soft thud. */
  punch(intensity = 1) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastPunch < 0.028) return;
    this.lastPunch = t;
    const src = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600 + Math.random() * 800;
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    const vol = Math.min(0.5, 0.16 + intensity * 0.05);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + 0.06);
  }

  /** Thread being pulled out: short downward whoosh. */
  pull() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastPull < 0.05) return;
    this.lastPull = t;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** Continuous soft thread draw while stitching. */
  draw() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastDraw < 0.09) return;
    this.lastDraw = t;
    const src = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(lp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + 0.09);
  }

  /** Cloth rustle proportional to physics motion energy. */
  rustle(motion: number) {
    if (!this.rustleGain || !this.ctx) return;
    const target = this.enabled ? Math.min(0.05, motion * 0.0006) : 0;
    this.rustleGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }
}

let shared: StitchAudio | null = null;
export function getAudio(): StitchAudio {
  if (!shared) shared = new StitchAudio();
  return shared;
}

/** Fire a haptic pulse if supported. */
export function haptic(ms: number) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}
