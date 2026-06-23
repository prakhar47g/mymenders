export const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-js';

declare global {
  interface Window {
    __googleMapsLoadPromise?: Promise<void>;
  }
}

const buildMarkerSvg = (fillColor: string, strokeColor: string) => {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='${strokeColor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' fill='${fillColor}'/><circle cx='12' cy='10' r='3' fill='${strokeColor}'/></svg>`;
};

export const createLocationPinIcon = (googleMaps: any, fillColor = '#99C4CB', strokeColor = '#ffffff') => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildMarkerSvg(fillColor, strokeColor))}`,
  scaledSize: new googleMaps.Size(36, 36),
  anchor: new googleMaps.Point(18, 36),
});

export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps cannot be loaded in a non-browser environment.'));
  }

  if ((window as any).google?.maps) {
    return Promise.resolve();
  }

  if (window.__googleMapsLoadPromise) {
    return window.__googleMapsLoadPromise;
  }

  const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    window.__googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
      if ((window as any).google?.maps) {
        resolve();
        return;
      }
      const onLoad = () => resolve();
      const onError = () => reject(new Error('Failed to load Google Maps script.'));
      existingScript.addEventListener('load', onLoad, { once: true });
      existingScript.addEventListener('error', onError, { once: true });
    });
    return window.__googleMapsLoadPromise;
  }

  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY environment variable.'));
  }

  const script = document.createElement('script');
  script.id = GOOGLE_MAPS_SCRIPT_ID;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,maps3d`;
  script.async = true;
  script.defer = true;

  window.__googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => {
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new Error('Failed to load Google Maps script.'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return window.__googleMapsLoadPromise;
};
