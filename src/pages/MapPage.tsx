import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Globe, Globe2, House, Layers3, MapPin, MessageSquareQuote, Minus, Navigation, Phone, Plus, Signpost, Star } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Vendor } from '../types';
import { AddMenderModal } from '../components/AddMenderModal';
import { reverseGeocode } from '../utils/geoapify';

const DEFAULT_CENTER: [number, number] = [20, 0]; // [lat, lng]
const GLOBAL_ZOOM = 2.5;
const LOCAL_ZOOM = 15;
const AUTO_CENTER_TO_FIRST_VENDOR = false;
const DEFAULT_ENTRY_LEVEL = 'Verified Mender';
const VENDOR_SOURCE_ID = 'vendors';
const CLUSTER_CIRCLE_LAYER_ID = 'vendor-clusters';
const CLUSTER_COUNT_LAYER_ID = 'vendor-cluster-count';
const UNCLUSTERED_LAYER_ID = 'vendor-points';
const ADDRESS_PLACEHOLDER = 'address not available';
const BASEMAP_STYLES = [
  { id: 'positron', label: 'Positron', styleUrl: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'bright', label: 'Bright', styleUrl: 'https://tiles.openfreemap.org/styles/bright' },
  { id: 'liberty', label: 'Liberty', styleUrl: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'dark', label: 'Dark', styleUrl: 'https://tiles.openfreemap.org/styles/dark' },
  { id: 'fiord', label: 'Fiord', styleUrl: 'https://tiles.openfreemap.org/styles/fiord' },
] as const;
const DEFAULT_BASEMAP_STYLE_ID = 'bright';
const PIN_COLOR_MAP: Record<string, string> = {
  'Verified Mender': '#2A9D8F',
  'Community Contribution': '#F4A261',
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

const normalizeEntryLevel = (entryLevel?: string) => {
  if (!entryLevel) return DEFAULT_ENTRY_LEVEL;
  if (entryLevel === 'Menders') return 'Verified Mender';
  if (entryLevel === 'Member of the public') return 'Community Contribution';
  return entryLevel;
};

const getPinColor = (entryLevel?: string) => {
  if (!entryLevel) return PIN_COLOR_MAP.default;
  return PIN_COLOR_MAP[entryLevel] || PIN_COLOR_MAP.default;
};

const renderIconMarkup = (icon: React.ReactElement) => renderToStaticMarkup(icon);

const DIRECTIONS_BUTTON_ICON = renderIconMarkup(<Signpost className="w-4 h-4" aria-hidden="true" />);
const ADDRESS_ICON = renderIconMarkup(<MapPin className="w-4 h-4" aria-hidden="true" />);
const PHONE_ICON = renderIconMarkup(<Phone className="w-4 h-4" aria-hidden="true" />);
const ONLINE_ICON = renderIconMarkup(<Globe2 className="w-4 h-4" aria-hidden="true" />);
const REVIEW_ICON = renderIconMarkup(<MessageSquareQuote className="w-4 h-4" aria-hidden="true" />);
const RATING_ICON = renderIconMarkup(<Star className="w-4 h-4 fill-current" aria-hidden="true" />);
const HOUSE_ICON = renderIconMarkup(<House className="w-4 h-4" aria-hidden="true" />);

const toDisplayName = (name?: string) => (name || '').trim();

const shouldResolveVendorAddress = (address?: string) =>
  (address || '').trim().toLowerCase() === ADDRESS_PLACEHOLDER;

const emptyVendorFeatureCollection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [],
};

const buildVendorFeatureCollection = (vendors: Vendor[]): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: vendors.flatMap((vendor) => {
    const latitude = parseCoordinate(vendor.latitude);
    const longitude = parseCoordinate(vendor.longitude);
    if (latitude === undefined || longitude === undefined) return [];

    return [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: toLngLat(latitude, longitude),
        },
        properties: {
          vendorId: vendor.id,
          pinColor: getPinColor(normalizeEntryLevel(vendor.entry_level || vendor.category)),
        },
      },
    ];
  }),
});

const hydrateVendorAddress = async (vendor: Vendor): Promise<Vendor> => {
  if (!shouldResolveVendorAddress(vendor.address)) {
    return vendor;
  }

  const latitude = parseCoordinate(vendor.latitude);
  const longitude = parseCoordinate(vendor.longitude);
  if (latitude === undefined || longitude === undefined) {
    return vendor;
  }

  const resolvedAddress = await reverseGeocode(latitude, longitude);
  if (!resolvedAddress) {
    return vendor;
  }

  return {
    ...vendor,
    address: resolvedAddress,
  };
};

const persistVendorAddress = async (vendor: Vendor) => {
  if (!vendor.id || !vendor.address) return;

  const res = await fetch(`${window.location.origin}/api/vendors`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: vendor.id,
      address: vendor.address,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to persist vendor address: ${res.status}`);
  }
};

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
    entry_level: normalizeEntryLevel(raw.entry_level || (metadata as any)?.entry_level),
  };
};

const buildTagRow = (container: HTMLDivElement, label: string, items: string[]) => {
  if (!items.length) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-3';

  const title = document.createElement('div');
  title.className = 'text-xs font-semibold uppercase text-slate-500 mb-1 mymenders-map-card-label';
  title.textContent = label;
  wrapper.append(title);

  const tags = document.createElement('div');
  tags.className = 'flex flex-wrap gap-1.5';
  items.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'mymenders-cloth-chip inline-flex items-center gap-1 px-2 py-0.5 text-xs';
    chip.textContent = tag;
    tags.append(chip);
  });
  wrapper.append(tags);
  container.append(wrapper);
};

const appendTextRow = (container: HTMLDivElement, iconMarkup: string, value: string) => {
  const row = document.createElement('div');
  row.className = 'mb-2 flex items-start gap-2 text-sm text-slate-700';

  const icon = document.createElement('div');
  icon.className = 'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-slate-500';
  icon.innerHTML = iconMarkup;

  const text = document.createElement('span');
  text.className = 'min-w-0 flex-1 break-words leading-relaxed';
  text.textContent = value;

  row.append(icon, text);
  container.append(row);
};

const buildPopoverContent = (vendor: Vendor, onDirections: (vendor: Vendor) => void) => {
  const container = document.createElement('div');
  container.className = 'min-w-[252px] p-3 pr-4';

  const title = document.createElement('h3');
  title.className = 'mb-2 pr-8 text-base font-medium leading-tight tracking-[-0.01em] text-slate-900 capitalize';
  title.textContent = toDisplayName(vendor.name);
  container.append(title);

  const entry = document.createElement('div');
  entry.className = 'mymenders-cloth-label mb-3 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-normal uppercase tracking-[0.08em]';
  entry.textContent = normalizeEntryLevel(vendor.entry_level || vendor.category);
  container.append(entry);

  const primaryType = vendor.types?.[0]?.trim();
  if (primaryType) {
    appendTextRow(container, HOUSE_ICON, primaryType);
  }

  if (vendor.phone) appendTextRow(container, PHONE_ICON, vendor.phone);
  if (vendor.address) appendTextRow(container, ADDRESS_ICON, vendor.address);
  if (vendor.online_presence) appendTextRow(container, ONLINE_ICON, vendor.online_presence);
  buildTagRow(container, 'Categories', vendor.categories || []);
  buildTagRow(container, 'Regional techniques', vendor.regional_techniques || []);

  if (vendor.review_text) {
    appendTextRow(container, REVIEW_ICON, vendor.review_text);
  }

  if ((vendor.rating || 0) > 0) {
    const rating = document.createElement('div');
    rating.className = 'mt-2 inline-flex items-center gap-2 rounded-md border border-[#e7cda8] bg-[#fff4df] px-3 py-1 text-xs font-medium text-amber-800';
    rating.innerHTML = `
      <span class="inline-flex h-5 w-5 items-center justify-center text-amber-600">
        ${RATING_ICON}
      </span>
      <span>${(vendor.rating || 0).toFixed(1)} (${vendor.rating_count || 0} review${vendor.rating_count === 1 ? '' : 's'})</span>
    `;
    container.append(rating);
  }

  const directionsButton = document.createElement('button');
  directionsButton.type = 'button';
  directionsButton.className =
    'mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#3e3024] text-white text-xs font-semibold hover:bg-[#5b4635] transition-colors';
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

const englishLabelField = [
  'coalesce',
  ['get', 'name_en'],
  ['get', 'name:en'],
  ['get', 'name_int'],
  ['get', 'name:latin'],
  ['get', 'name'],
] as const;

const getEnglishLabelOverride = (textField: unknown) => {
  if (typeof textField === 'string') {
    return textField.toLowerCase().includes('name') ? englishLabelField : null;
  }

  if (Array.isArray(textField)) {
    return JSON.stringify(textField).toLowerCase().includes('name') ? englishLabelField : null;
  }

  return null;
};

const applyEnglishLabelOverrides = (map: maplibregl.Map) => {
  const layers = map.getStyle()?.layers || [];

  layers.forEach((layer) => {
    if (layer.type !== 'symbol') return;

    const textField = map.getLayoutProperty(layer.id, 'text-field');
    const override = getEnglishLabelOverride(textField);
    if (!override) return;

    map.setLayoutProperty(layer.id, 'text-field', override);
  });
};

const ensureVendorLayers = (map: maplibregl.Map) => {
  if (!map.getSource(VENDOR_SOURCE_ID)) {
    map.addSource(VENDOR_SOURCE_ID, {
      type: 'geojson',
      data: emptyVendorFeatureCollection,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 56,
    });
  }

  if (!map.getLayer(CLUSTER_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_CIRCLE_LAYER_ID,
      type: 'circle',
      source: VENDOR_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#99C4CB',
          10,
          '#6EB7B0',
          25,
          '#2A9D8F',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18,
          10,
          22,
          25,
          28,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.95,
      },
    });
  }

  if (!map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: VENDOR_SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Semibold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });
  }

  if (!map.getLayer(UNCLUSTERED_LAYER_ID)) {
    map.addLayer({
      id: UNCLUSTERED_LAYER_ID,
      type: 'circle',
      source: VENDOR_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['coalesce', ['get', 'pinColor'], PIN_COLOR_MAP.default],
        'circle-radius': 7,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.98,
      },
    });
  }
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
  const [selectedBasemapStyleId, setSelectedBasemapStyleId] =
    useState<(typeof BASEMAP_STYLES)[number]['id']>(DEFAULT_BASEMAP_STYLE_ID);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const vendorsRef = useRef<Vendor[]>([]);
  const hasAutoCentered = useRef(false);
  const activeBasemapStyleIdRef = useRef<(typeof BASEMAP_STYLES)[number]['id']>(DEFAULT_BASEMAP_STYLE_ID);

  useEffect(() => {
    let cancelled = false;

    const loadVendors = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/vendors`);
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;

        setVendors(data.map(normalizeVendor));
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      }
    };

    loadVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    vendorsRef.current = vendors;
  }, [vendors]);

  const selectedBasemapStyle =
    BASEMAP_STYLES.find((style) => style.id === selectedBasemapStyleId) ?? BASEMAP_STYLES[0];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: selectedBasemapStyle.styleUrl,
      center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
      zoom: GLOBAL_ZOOM,
      attributionControl: true,
      logoPosition: 'bottom-left',
    });

    const handleStyleLoad = () => {
      applyGlobeProjectionIfSupported(map);
      applyEnglishLabelOverrides(map);
      ensureVendorLayers(map);
      setIsMapReady(true);
    };

    map.on('style.load', handleStyleLoad);

    const handleMapClick = async (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(CLUSTER_CIRCLE_LAYER_ID) || !map.getLayer(UNCLUSTERED_LAYER_ID)) return;

      const clusterFeatures = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_CIRCLE_LAYER_ID, CLUSTER_COUNT_LAYER_ID],
      });
      const clusterFeature = clusterFeatures[0];

      if (clusterFeature) {
        const clusterId = Number(clusterFeature.properties?.cluster_id);
        const source = map.getSource(VENDOR_SOURCE_ID) as GeoJSONSource | undefined;
        if (!source || !Number.isFinite(clusterId)) return;

        const expansionZoom = await source.getClusterExpansionZoom(clusterId);
        const [longitude, latitude] = (clusterFeature.geometry as GeoJSON.Point).coordinates;

        map.flyTo({
          center: [longitude, latitude],
          zoom: expansionZoom,
          duration: 700,
        });
        return;
      }

      const vendorFeatures = map.queryRenderedFeatures(event.point, {
        layers: [UNCLUSTERED_LAYER_ID],
      });
      const vendorFeature = vendorFeatures[0];

      if (!vendorFeature) return;

      const vendorId = Number(vendorFeature.properties?.vendorId);
      const vendor = vendorsRef.current.find((item) => item.id === vendorId);
      if (!vendor) return;

      const resolvedVendor = await hydrateVendorAddress(vendor);
      if (resolvedVendor.address !== vendor.address) {
        setVendors((prev) => prev.map((item) => (item.id === resolvedVendor.id ? resolvedVendor : item)));
        persistVendorAddress(resolvedVendor).catch((error) => {
          console.error('Failed to persist resolved vendor address:', error);
        });
      }

      const [longitude, latitude] = (vendorFeature.geometry as GeoJSON.Point).coordinates;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: 280 })
        .setLngLat([longitude, latitude])
        .setDOMContent(
          buildPopoverContent(resolvedVendor, (selectedVendor) => {
            const targetLatitude = parseCoordinate(selectedVendor.latitude);
            const targetLongitude = parseCoordinate(selectedVendor.longitude);
            if (targetLatitude === undefined || targetLongitude === undefined) return;
            map.flyTo({
              center: toLngLat(targetLatitude, targetLongitude),
              zoom: DIRECTION_ZOOM,
              duration: DIRECTION_FLY_DURATION_MS,
            });
          }),
        )
        .addTo(map);
    };

    const handlePointerMove = (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(CLUSTER_CIRCLE_LAYER_ID) || !map.getLayer(UNCLUSTERED_LAYER_ID)) return;

      const interactiveFeatures = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_CIRCLE_LAYER_ID, CLUSTER_COUNT_LAYER_ID, UNCLUSTERED_LAYER_ID],
      });
      map.getCanvas().style.cursor = interactiveFeatures.length ? 'pointer' : '';
    };

    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', handleMapClick);
    map.on('mousemove', handlePointerMove);
    map.on('mouseout', clearPointerCursor);

    mapInstanceRef.current = map;

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.off('style.load', handleStyleLoad);
      map.off('click', handleMapClick);
      map.off('mousemove', handlePointerMove);
      map.off('mouseout', clearPointerCursor);
      map.remove();
      mapInstanceRef.current = null;
      setIsMapReady(false);
      hasAutoCentered.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    const source = map.getSource(VENDOR_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(buildVendorFeatureCollection(vendors));
  }, [vendors, isMapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeBasemapStyleIdRef.current === selectedBasemapStyle.id) {
      return;
    }

    activeBasemapStyleIdRef.current = selectedBasemapStyle.id;
    popupRef.current?.remove();
    popupRef.current = null;
    setIsMapReady(false);
    map.setStyle(selectedBasemapStyle.styleUrl);
  }, [selectedBasemapStyle]);

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
      const normalizedVendor = normalizeVendor(newVendor);
      setVendors((prev) => [...prev, normalizedVendor]);
      setShowAddModal(false);
      setCenterMapTo({
        lat: normalizedVendor.latitude,
        lng: normalizedVendor.longitude,
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
          className="mymenders-cloth-panel w-11 h-11 rounded-full bg-cloth border shadow-sm flex items-center justify-center text-[#3e3024] hover:bg-[#fffaf1]"
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
          className="mymenders-cloth-panel w-11 h-11 rounded-full bg-cloth border shadow-sm flex items-center justify-center text-[#3e3024] hover:bg-[#fffaf1]"
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
          className="mymenders-cloth-panel w-11 h-11 rounded-full bg-cloth border shadow-sm flex items-center justify-center text-[#3e3024] hover:bg-[#fffaf1]"
          aria-label="Reset to globe view"
        >
          <Globe className="w-5 h-5" />
        </button>

        <div className="mymenders-cloth-panel mt-1 overflow-hidden rounded-2xl border bg-cloth/95 shadow-sm backdrop-blur-sm">
          <label
            htmlFor="map-style-select"
            className="flex items-center gap-2 border-b border-[#e2d3be] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#75604b]"
          >
            <Layers3 className="h-3.5 w-3.5 text-stitch" />
            Style
          </label>
          <select
            id="map-style-select"
            value={selectedBasemapStyleId}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedBasemapStyleId(event.target.value as (typeof BASEMAP_STYLES)[number]['id'])
            }
            className="w-full appearance-none bg-transparent px-3 py-2.5 text-sm font-medium text-[#3e3024] outline-none"
          >
            {BASEMAP_STYLES.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <button
          onClick={locateUser}
          disabled={findingLocation}
          className="mymenders-cloth-panel bg-cloth border rounded-lg text-sm font-semibold hover:bg-[#fffaf1] shadow-sm flex items-center gap-2 px-5 py-2.5 disabled:opacity-70 disabled:cursor-not-allowed text-[#3e3024]"
        >
          <Navigation className={`w-4 h-4 ${findingLocation ? 'animate-pulse text-[#aa9276]' : 'text-[#3e3024]'}`} />
          {findingLocation ? 'Locating...' : 'Near Me'}
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand text-[#2f3e39] px-5 py-2.5 rounded-lg shadow-lg shadow-brand-light text-sm font-bold flex items-center gap-2 hover:bg-brand-hover transition-colors"
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
