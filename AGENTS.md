# Project notes

## Brand logo
- The My Mender logo is the **three vertical stripes** mark — see `src/components/BrandLogo.tsx` (used in the site navbar and the admin navbar). It renders white stripes on dark surfaces (`#fafafa` default) or dark stripes via the `color` prop on light surfaces.
- The stitched "MY MENDER" wordmark (`StitchedLogo`, `src/components/StitchedLogo.tsx`) is **NOT the logo** — it is a decorative footer element only. Never use it as the brand logo.

## Admin design scheme
- The admin (`/admin`) uses a strict **white-black monochrome** palette: jet black `#0a0a0a` accents (header, primary buttons, login bg), pure white `#fff` body, gray scale `#111` → `#555` → `#777` → `#999` → `#bbb`, uniform `#e5e5e5` borders, `#f5f5f5` hovers.
- No brand blues (`brand-dark`, `brand`, `#6eb7b0`) in admin. Form fields get `mymenders-field--mono` for a black focus ring (the base `mymenders-field` keeps its blue ring for public pages).
