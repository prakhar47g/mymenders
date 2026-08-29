// The My Mender brand logo: three vertical stripes.
// This is the official logo (also used in the site navbar) — NOT the
// stitched wordmark in the footer, which is decorative only.
export function BrandLogo({
  className = 'h-6 w-6',
  color = '#fafafa',
}: {
  className?: string;
  /** Stripe fill colour — white for dark navbars, dark for light surfaces. */
  color?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="6" y="10" width="24" height="80" fill={color} />
      <rect x="38" y="10" width="24" height="80" fill={color} />
      <rect x="70" y="10" width="24" height="80" fill={color} />
    </svg>
  );
}
