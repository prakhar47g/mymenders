export type MenderClickAction =
  | 'mender_open'
  | 'phone_click'
  | 'email_click'
  | 'social_click'
  | 'website_click';

export function trackMenderClick(vendorId: number, action: MenderClickAction) {
  const payload = JSON.stringify({ vendorId, action });

  try {
    const body = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon('/api/mender-clicks', body)) return;
  } catch {
    // Fall back to fetch if sendBeacon is unavailable or rejects the payload.
  }

  void fetch('/api/mender-clicks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
