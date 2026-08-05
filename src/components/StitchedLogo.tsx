// Animated stitched "MY MENDER" wordmark for the footer.
// Rendered with the vendored Kantha thread-simulation engine
// (src/lib/stitch, MIT — see LICENSE-Kantha).
// The threads are the same colour as the footer's surface
// (--color-brand-dark #EBEBEB), lightened a shade each step, so the
// wordmark reads as a subtle raised texture rather than a dark mark.
import { textToStitchConfig, type ImageStitchConfig } from "../lib/stitch";
import { StitchSurface } from "./stitch/stitch-surface";

// Shade steps above the footer surface — "just a shade lighter".
const LIGHTEN_STEPS = [0.06, 0.18, 0.3, 0.44];

function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function stitchPalette(): string[] {
  // The footer surface is --color-brand-dark; read it from CSS so the
  // wordmark always tracks the footer colour. Canvas can't take var(),
  // hence the computed read. Fallback mirrors the current theme value.
  if (typeof document !== "undefined") {
    const base = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-brand-dark")
      .trim();
    if (base) return LIGHTEN_STEPS.map((t) => lighten(base, t));
  }
  return LIGHTEN_STEPS.map((t) => lighten("#EBEBEB", t));
}

// Deterministic (seeded) config, computed once — textToStitchConfig is pure.
let config: ImageStitchConfig | null = null;
function getConfig(): ImageStitchConfig {
  if (!config) {
    config = textToStitchConfig("MY MENDER", {
      seed: 7,
      scale: 2,
      cell: 16,
      colorMode: "letters",
      palette: stitchPalette(),
    });
  }
  return config;
}

export function StitchedLogo({
  className,
  animate = false,
}: {
  className?: string;
  /** Skip the stitch-on reveal and render the settled wordmark instantly. */
  animate?: boolean;
}) {
  return (
    <div aria-hidden="true" className={className}>
      <StitchSurface
        image={getConfig()}
        physics="cloth"
        interactive
        animate={animate}
        background={null}
        fit="fill"
        className="block w-full"
      />
    </div>
  );
}
