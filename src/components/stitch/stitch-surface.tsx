"use client";

import { useEffect, useRef } from "react";
import {
  StitchEngine,
  renderCanvas,
  renderWebGL,
  getSharedGL,
  getAudio,
  haptic,
  type ImageStitchConfig,
  type SatinStitchConfig,
  type PhysicsMode,
} from "../../lib/stitch";

export interface StitchSurfaceProps {
  image?: ImageStitchConfig;
  satin?: SatinStitchConfig;
  /** Animate the stitch-on reveal (else reveal instantly). */
  animate?: boolean;
  loop?: boolean;
  interactive?: boolean;
  physics?: PhysicsMode;
  background?: string | null;
  /** "webgl" (shared context) with Canvas2D fallback, or force "canvas". */
  renderer?: "webgl" | "canvas";
  /** Thread material for image artwork (satins carry their own). */
  material?: string;
  /** Global thread-width multiplier. */
  widthScale?: number;
  reducedMotion?: boolean;
  /** Play synthesized punch/pull/draw/rustle feedback. */
  sound?: boolean;
  haptics?: boolean;
  /** "fill" stretches to container width; "contain" fits inside a fixed box. */
  fit?: "fill" | "contain";
  className?: string;
  /** Called once with the engine so parents can drive it. */
  onEngine?: (engine: StitchEngine) => void;
}

function configureFromImage(
  cfg: ImageStitchConfig,
  material: string,
  widthScale?: number,
): StitchEngine {
  const eng = new StitchEngine(cfg.cols, cfg.rows, cfg.cell);
  eng.inset = cfg.insetPct ?? 0;
  eng.sheen = cfg.style?.sheen ?? true;
  eng.castShadow = cfg.style?.shadow ?? false;
  if (widthScale != null) eng.widthScale = widthScale;
  eng.motion.mode = cfg.anim?.mode ?? "coordinated";
  eng.motion.stagger = cfg.anim?.stagger ?? 90;
  eng.motion.speed = (cfg.anim?.legDur ?? 260) * 2;
  eng.motion.order = cfg.anim?.order ?? "ltr";
  eng.motion.waveDir = cfg.anim?.waveDir ?? "right";
  eng.loadPlaced(cfg.units, { material, schedule: false });
  return eng;
}

function configureFromSatin(cfg: SatinStitchConfig): StitchEngine {
  const pad = 8;
  const cell = 8;
  const cols = Math.ceil(cfg.vbw / cell);
  const rows = Math.ceil(cfg.vbh / cell);
  const eng = new StitchEngine(cols, rows, cell, pad);
  eng.loadSegments(cfg.threads, {
    material: cfg.material ?? "cotton",
    width: cfg.thick ?? 1,
    schedule: false,
  });
  return eng;
}

export function StitchSurface({
  image,
  satin,
  animate = true,
  loop = false,
  interactive = true,
  physics = "cloth",
  background = null,
  renderer = "webgl",
  material = "cotton",
  widthScale,
  reducedMotion = false,
  sound = false,
  haptics = false,
  fit = "fill",
  className,
  onEngine,
}: StitchSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const eng = image
      ? configureFromImage(image, material, widthScale)
      : satin
        ? configureFromSatin(satin)
        : null;
    if (!eng) return;

    eng.physicsEnabled = interactive;
    eng.physics.mode = physics;
    eng.motion.loop = loop;
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    eng.reducedMotion = reducedMotion || prefersReduced;

    const audio = getAudio();
    audio.enabled = sound;
    onEngine?.(eng);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const wpx = Math.round(eng.W * dpr);
    const hpx = Math.round(eng.H * dpr);
    canvas.width = wpx;
    canvas.height = hpx;
    canvas.style.aspectRatio = `${eng.W} / ${eng.H}`;

    const useGL = renderer === "webgl" && !!getSharedGL();

    if (animate) eng.scheduleAll(performance.now());
    else eng.revealAll();

    const paint = () => {
      if (useGL) {
        // GL output is transparent; lay the background on the 2D target first.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, wpx, hpx);
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, wpx, hpx);
        }
        if (renderWebGL(ctx, eng, wpx, hpx)) return;
      }
      // Canvas2D path (world-scaled).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderCanvas(ctx, eng, { background });
    };

    let raf = 0;
    let running = true;
    const frame = (t: number) => {
      if (!running) return;
      const res = eng.tick(t);
      paint();
      if (sound) {
        if (res.punches > 0) {
          audio.punch(res.punches);
          if (haptics) haptic(6);
        }
        if (res.pulls > 0) audio.pull();
        if (res.drawing) audio.draw();
        audio.rustle(res.motion);
      }
      // Keep animating while stitching, physics is live, or looping.
      if (res.anyStitching || !eng.isSettled() || loop) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
      }
    };
    raf = requestAnimationFrame(frame);

    const wake = () => {
      if (!raf && running) raf = requestAnimationFrame(frame);
    };
    const unsub = eng.onWake(wake);

    // Pointer -> physics push (world coords).
    const toWorld = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [
        ((e.clientX - rect.left) / rect.width) * eng.W,
        ((e.clientY - rect.top) / rect.height) * eng.H,
      ];
    };
    const onMove = (e: PointerEvent) => {
      if (!interactive) return;
      const [x, y] = toWorld(e);
      eng.setPointer(x, y, { active: true });
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (!interactive) return;
      const [x, y] = toWorld(e);
      eng.setPointer(x, y, { active: true, down: true });
      if (physics === "ripple") eng.addRipple(x, y);
      wake();
    };
    const onUp = () => eng.releasePointer();
    const onLeave = () => eng.clearPointer();
    if (interactive) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointerleave", onLeave);
    }

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      unsub();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      eng.dispose();
    };
  }, [image, satin, animate, loop, interactive, physics, background, renderer, material, widthScale, reducedMotion, sound, haptics, onEngine]);

  const fitStyle: React.CSSProperties =
    fit === "contain"
      ? { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }
      : { width: "100%", height: "auto" };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", touchAction: "none", ...fitStyle }}
    />
  );
}
