const GEOAPIFY_KEY = '4566ba494f5a4c6d8ad8cb137d73aae2';
const BASE = 'https://api.geoapify.com/v1/geocode';

export interface GeoapifySuggestion {
  formatted: string;
  lat: number;
  lng: number;
  city?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  country?: string;
}

export interface GeoapifyResult {
  formatted: string;
  lat: number;
  lng: number;
}

/** Search for address suggestions as the user types */
export async function autocomplete(query: string): Promise<GeoapifySuggestion[]> {
  if (!query || query.trim().length < 3) return [];

  const url = `${BASE}/autocomplete?text=${encodeURIComponent(query)}&format=json&apiKey=${GEOAPIFY_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.features?.length) return [];

    return data.features.map((f: any) => ({
      formatted: f.properties?.formatted || '',
      lat: f.properties?.lat,
      lng: f.properties?.lon,
      city: f.properties?.city,
      street: f.properties?.street,
      housenumber: f.properties?.housenumber,
      postcode: f.properties?.postcode,
      country: f.properties?.country,
    }));
  } catch {
    return [];
  }
}

/** Reverse geocode: lat/lng → address string */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `${BASE}/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${GEOAPIFY_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.features?.[0]?.properties?.formatted || null;
  } catch {
    return null;
  }
}

/** Forward geocode: address string → { lat, lng, formatted } */
export async function forwardGeocode(
  address: string,
): Promise<GeoapifyResult | null> {
  if (!address.trim()) return null;

  const url = `${BASE}/search?text=${encodeURIComponent(address)}&format=json&limit=1&apiKey=${GEOAPIFY_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;
    return { formatted: r.formatted, lat: r.lat, lng: r.lon };
  } catch {
    return null;
  }
}
