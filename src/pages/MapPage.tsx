import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Globe, Minus, Navigation, Plus, Signpost } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Vendor } from '../types';
import { AddMenderModal } from '../components/AddMenderModal';

const DEFAULT_CENTER: [number, number] = [20, 0]; // [lat, lng]
const GLOBAL_ZOOM = 1.9;
const LOCAL_ZOOM = 13;
const AUTO_CENTER_TO_FIRST_VENDOR = false;
const DEFAULT_ENTRY_LEVEL = 'Menders';
const PIN_COLOR_MAP: Record<string, string> = {
  Menders: '#2A9D8F',
  'Member of the public': '#F4A261',
  default: '#99C4CB',
};

const parseCoordinate = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseListFromSource = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // fallback below
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getPinColor = (entryLevel?: string) => {
  if (!entryLevel) return PIN_COLOR_MAP.default;
  return PIN_COLOR_MAP[entryLevel] || PIN_COLOR_MAP.default;
};

const DIRECTIONS_BUTTON_ICON = renderToStaticMarkup(<Signpost className="w-4 h-4" aria-hidden="true" />);

const normalizeVendor = (raw: any): Vendor => {
  let metadata: Record<string, any> = {};
  try {
    if (typeof raw?.photos === 'string') {
      const parsed = JSON.parse(raw.photos);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = parsed;
      }
    } else if (raw?.photos && typeof raw.photos === 'object') {
      metadata = raw.photos;
    }
  } catch {
    metadata = {};
  }

  return {
    ...raw,
    latitude: parseCoordinate(raw.latitude) ?? Number.NaN,
    longitude: parseCoordinate(raw.longitude) ?? Number.NaN,
    rating: typeof raw.rating === 'number' ? raw.rating : Number(raw.rating) || 0,
    rating_count: Number(raw.rating_count) || Number((metadata as any)?.rating_count) || 0,
    types: parseListFromSource(raw.types || (metadata as any)?.types || (raw as any).type || (metadata as any)?.type),
    categories: parseListFromSource(raw.categories || (metadata as any)?.categories),
    regional_techniques: parseListFromSource(raw.regional_techniques || (metadata as any)?.regional_techniques),
    online_presence: raw.online_presence || raw.website || (metadata as any)?.online_presence || (metadata as any)?.website,
    review_text: raw.review_text || (metadata as any)?.review_text,
    entry_level: raw.entry_level || (metadata as any)?.entry_level || DEFAULT_ENTRY_LEVEL,
  };
};

const buildTagRow = (container: HTMLDivElement, label: string, items: string[]) => {
  if (!items.length) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-3';

  const title = document.createElement('div');
  title.className = 'text-xs font-semibold uppercase tracking-tighter text-slate-500 mb-1';
  title.textContent = label;
  wrapper.append(title);

  const tags = document.createElement('div');
  tags.className = 'flex flex-wrap gap-1.5';
  items.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs';
    chip.textContent = tag;
    tags.append(chip);
  });
  wrapper.append(tags);
  container.append(wrapper);
};

const appendTextRow = (container: HTMLDivElement, label: string, value: string) => {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 text-sm text-slate-600 mb-1';

  const icon = document.createElement('span');
  icon.className = 'text-slate-400';
  icon.textContent = label;

  const text = document.createElement('span');
  text.className = 'line-clamp-1';
  text.textContent = value;

  row.append(icon, text);
  container.append(row);
};

const createPinElement = (color: string) => {
  const pin = document.createElement('div');
  pin.style.width = '18px';
  pin.style.height = '18px';
  pin.style.borderRadius = '50%';
  pin.style.border = '2px solid rgba(255, 255, 255, 0.95)';
  pin.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.35)';
  pin.style.cursor = 'pointer';
  pin.style.transform = 'translate(-50%, -100%)';
  pin.style.background = color;
  return pin;
};

const buildPopoverContent = (vendor: Vendor, onDirections: (vendor: Vendor) => void) => {
  const container = document.createElement('div');
  container.className = 'min-w-[240px] p-2';

  const title = document.createElement('h3');
  title.className = 'font-bold text-slate-900 text-base leading-tight mb-2';
  title.textContent = vendor.name;
  container.append(title);

  const entry = document.createElement('div');
  entry.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand rounded-full text-xs font-medium mb-3';
  entry.textContent = vendor.entry_level || vendor.category || 'Menders';
  container.append(entry);

  if (vendor.types?.length) {
    buildTagRow(container, 'Type', vendor.types);
  }

  const contactLines: string[] = [];
  if (vendor.phone) contactLines.push(vendor.phone);
  if (vendor.online_presence) contactLines.push(vendor.online_presence);
  if (contactLines.length) {
    const contact = document.createElement('div');
    contact.className = 'text-sm text-slate-600 leading-relaxed mb-2';
    contact.textContent = contactLines.join(' • ');
    container.append(contact);
  }

  if (vendor.address) appendTextRow(container, 'Address', vendor.address);
  if (vendor.online_presence) appendTextRow(container, 'Online Presence', vendor.online_presence);
  buildTagRow(container, 'Categories', vendor.categories || []);
  buildTagRow(container, 'Regional techniques', vendor.regional_techniques || []);

  if (vendor.review_text) {
    appendTextRow(container, 'Review', vendor.review_text);
  }

  if ((vendor.rating || 0) > 0) {
    const rating = document.createElement('div');
    rating.className = 'flex items-center gap-1 mt-2';
    rating.textContent = `${(vendor.rating || 0).toFixed(1)} (${vendor.rating_count || 0} review${vendor.rating_count === 1 ? '' : 's'})`;
    container.append(rating);
  }

  const directionsButton = document.createElement('button');
  directionsButton.type = 'button';
  directionsButton.className =
    'mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors';
  directionsButton.innerHTML = `
    <span class="inline-flex items-center justify-center w-4 h-4">
      ${DIRECTIONS_BUTTON_ICON}
    </span>
    Details
  `;
  directionsButton.addEventListener('click', () => {
    onDirections(vendor);
  });
  container.append(directionsButton);

  return container;
};

const applyGlobeProjectionIfSupported = (map: maplibregl.Map) => {
  if (!map || typeof (map as any).setProjection !== 'function') {
    return;
  }

  try {
    (map as any).setProjection({ type: 'globe' });
  } catch {
    // Some runtimes can ship without globe support; gracefully continue.
  }
};

const toLngLat = (latitude: number, longitude: number) => [longitude, latitude] as [number, number];
const DIRECTION_ZOOM = 14.5;
const DIRECTION_FLY_DURATION_MS = Math.round(800 * 1.3);

export function MapPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [centerMapTo, setCenterMapTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [findingLocation, setFindingLocation] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const hasAutoCentered = useRef(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/vendors`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setVendors(data.map(normalizeVendor));
      })
      .catch((err) => console.error('Failed to fetch vendors:', err));
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, © CARTO',
          maxzoom: 19,
          minzoom: 0,
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
      zoom: GLOBAL_ZOOM,
      attributionControl: true,
      logoPosition: 'bottom-left',
    });

    map.on('load', () => {
      applyGlobeProjectionIfSupported(map);
      setIsMapReady(true);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      markerRefs.current = [];
      mapInstanceRef.current = null;
      setIsMapReady(false);
      hasAutoCentered.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    vendors.forEach((vendor) => {
      const latitude = parseCoordinate(vendor.latitude);
      const longitude = parseCoordinate(vendor.longitude);
      if (latitude === undefined || longitude === undefined) return;

      const pinColor = getPinColor(vendor.entry_level || vendor.category || DEFAULT_ENTRY_LEVEL);
      const markerElement = createPinElement(pinColor);
      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: 260 }).setDOMContent(
        buildPopoverContent(vendor, (selectedVendor) => {
          const targetLatitude = parseCoordinate(selectedVendor.latitude);
          const targetLongitude = parseCoordinate(selectedVendor.longitude);
          if (targetLatitude === undefined || targetLongitude === undefined) return;
          map.flyTo({
            center: toLngLat(targetLatitude, targetLongitude),
            zoom: DIRECTION_ZOOM,
            duration: DIRECTION_FLY_DURATION_MS,
          });
        }),
      );

      const marker = new maplibregl.Marker({ element: markerElement })
        .setLngLat(toLngLat(latitude, longitude))
        .setPopup(popup)
        .addTo(map);

      markerRefs.current.push(marker);
    });
  }, [vendors, isMapReady]);

  useEffect(() => {
  const map = mapInstanceRef.current;
    if (!isMapReady || !map || centerMapTo) return;

    if (!vendors.length || hasAutoCentered.current || !AUTO_CENTER_TO_FIRST_VENDOR) return;

    const validVendor = vendors.find((vendor) => {
      const latitude = parseCoordinate(vendor.latitude);
      const longitude = parseCoordinate(vendor.longitude);
      return latitude !== undefined && longitude !== undefined;
    });

    if (!validVendor) return;

    map.flyTo({
      center: toLngLat(validVendor.latitude, validVendor.longitude),
      zoom: LOCAL_ZOOM,
      duration: 1200,
    });
    hasAutoCentered.current = true;
  }, [vendors, isMapReady, centerMapTo]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isMapReady || !centerMapTo || !map) return;
    map.flyTo({
      center: [centerMapTo.lng, centerMapTo.lat],
      zoom: centerMapTo.zoom ?? LOCAL_ZOOM,
      duration: 900,
    });
  }, [centerMapTo, isMapReady]);

  const locateUser = () => {
    setFindingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenterMapTo({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            zoom: LOCAL_ZOOM,
          });
          setFindingLocation(false);
        },
        (error) => {
          console.error("Error finding location: ", error);
          alert("Couldn't find your location. Please check your browser permissions.");
          setFindingLocation(false);
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setFindingLocation(false);
    }
  };

  const handleAddMender = async (newMenderData: Omit<Vendor, 'id'>) => {
    try {
      const res = await fetch(`${window.location.origin}/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMenderData),
      });
      const newVendor = await res.json();
      setVendors((prev) => [...prev, normalizeVendor(newVendor)]);
      setShowAddModal(false);
      setCenterMapTo({
        lat: newVendor.latitude,
        lng: newVendor.longitude,
        zoom: LOCAL_ZOOM,
      });
      hasAutoCentered.current = true;
    } catch (err) {
      console.error('Failed to add vendor:', err);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] mt-16 z-0">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map controls */}
      <div className="absolute right-6 top-6 z-10 flex flex-col gap-2">
        <button
          onClick={() => {
            const map = mapInstanceRef.current;
            if (!map) return;
            map.zoomIn();
          }}
          className="w-11 h-11 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-900 hover:bg-slate-50"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            const map = mapInstanceRef.current;
            if (!map) return;
            map.zoomOut();
          }}
          className="w-11 h-11 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-900 hover:bg-slate-50"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            const map = mapInstanceRef.current;
            if (!map) return;
            map.flyTo({
              center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
              zoom: GLOBAL_ZOOM,
              pitch: 0,
              bearing: 0,
              duration: 700,
            });
          }}
          className="w-11 h-11 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-900 hover:bg-slate-50"
          aria-label="Reset to globe view"
        >
          <Globe className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <button
          onClick={locateUser}
          disabled={findingLocation}
          className="bg-white border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-100 shadow-sm flex items-center gap-2 px-5 py-2.5 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900"
        >
          <Navigation className={`w-4 h-4 ${findingLocation ? 'animate-pulse text-slate-400' : 'text-slate-900'}`} />
          {findingLocation ? 'Locating...' : 'Near Me'}
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand text-slate-800 px-5 py-2.5 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-hover transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Mender
        </button>
      </div>

      {showAddModal && (
        <AddMenderModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMender}
          onAddressSelect={(coords) => {
            setCenterMapTo({
              lat: coords[0],
              lng: coords[1],
              zoom: 16,
            });
          }}
        />
      )}
    </div>
  );
}
