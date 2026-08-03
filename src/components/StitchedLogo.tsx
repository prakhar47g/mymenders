// Animated stitched "MY MENDER" wordmark for the footer.
// Rendered with the vendored Kantha thread-simulation engine
// (src/lib/stitch, MIT — see LICENSE-Kantha).
// Palette is a muted blue-grey ramp close to the footer's navy
// (--color-brand-dark #1a2e45) so the wordmark stays subtle.
import { textToStitchConfig, type ImageStitchConfig } from "../lib/stitch";
import { StitchSurface } from "./stitch/stitch-surface";

const STITCH_PALETTE = ["#3a4f6e", "#4a6284", "#5c7599", "#758cae"];

// Deterministic (seeded) config, computed once — textToStitchConfig is pure.
const config: ImageStitchConfig = textToStitchConfig("MY MENDER", {
  seed: 7,
  scale: 2,
  cell: 16,
  colorMode: "letters",
  palette: STITCH_PALETTE,
});

export function StitchedLogo({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <StitchSurface
        image={config}
        physics="cloth"
        interactive
        background={null}
        fit="fill"
        className="block w-full"
      />
    </div>
  );
}
