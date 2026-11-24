import type { GeocodingAttribution } from '../types';

type GeocodingCreditProps = {
  sources?: GeocodingAttribution['sources'];
};

export function GeocodingCredit({ sources = [] }: GeocodingCreditProps) {
  return (
    <p className="text-[11px] leading-relaxed text-[var(--mm-muted)]">
      Powered by <a className="underline" href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a>
      {sources.map(({ label, url }) => (
        <span key={label}>
          {' · '}
          {url ? <a className="underline" href={url} target="_blank" rel="noopener">{label}</a> : label}
        </span>
      ))}
    </p>
  );
}
