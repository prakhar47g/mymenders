// Attribution can arrive via a public submission. Keep only display text and web links.
/** @returns {{ provider: 'geoapify', sources: { label: string, url?: string }[] } | undefined} */
export function normalizeGeocodingCredit(value) {
  if (value?.provider !== 'geoapify') return undefined;

  const sources = new Map();
  if (Array.isArray(value.sources)) {
    for (const source of value.sources.slice(0, 4)) {
      const label = typeof source?.label === 'string' ? source.label.trim().slice(0, 180) : '';
      if (!label) continue;

      let sourceUrl;
      if (typeof source.url === 'string' && source.url.length <= 2048) {
        try {
          const url = new URL(source.url);
          if (url.protocol === 'https:' || url.protocol === 'http:') sourceUrl = url.href;
        } catch {
          // Some sources only supply a usable attribution label.
        }
      }
      sources.set(label, { label, url: sourceUrl });
    }
  }

  return { provider: 'geoapify', sources: [...sources.values()] };
}
