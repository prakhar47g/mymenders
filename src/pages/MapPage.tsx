import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Plus } from 'lucide-react';
import { Vendor } from '../types';
import { AddMenderModal } from '../components/AddMenderModal';
import { loadGoogleMapsScript } from '../utils/googleMaps';

const DEFAULT_CENTER: [number, number] = [20, 0];
const GLOBE_RANGE_METERS = 18_000_000;
const LOCAL_RANGE_METERS = 2_400;
const LOCAL_TILT_DEGREES = 0;

type MapMode = 'ROADMAP' | 'SATELLITE' | 'HYBRID';

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

const buildPopoverContent = (vendor: Vendor) => {
  const container = document.createElement('div');
  container.className = 'min-w-[240px] p-1 pt-2';

  const title = document.createElement('h3');
  title.className = 'font-bold text-slate-900 text-base leading-tight mb-2';
  title.textContent = vendor.name;
  container.append(title);

  const category = document.createElement('div');
  category.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand rounded-full text-xs font-medium mb-3';
  category.textContent = vendor.category;
  container.append(category);

  if (vendor.phone) appendTextRow(container, 'Phone', vendor.phone);
  if (vendor.address) appendTextRow(container, 'Place', vendor.address);
  if (vendor.hours) appendTextRow(container, 'Time', vendor.hours);

  if (vendor.rating > 0) {
    const rating = document.createElement('div');
    rating.className = 'flex items-center gap-1 mt-2';
    rating.textContent = `${vendor.rating.toFixed(1)} (${vendor.rating_count} reviews)`;
    container.append(rating);
  }

  return container;
};

export function MapPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [centerMapTo, setCenterMapTo] = useState<[number, number] | null>(null);
  const [findingLocation, setFindingLocation] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('ROADMAP');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerElementsRef = useRef<any[]>([]);
  const popoverRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/vendors`)
      .then(res => res.json())
      .then(data => setVendors(data))
      .catch(err => console.error('Failed to fetch vendors:', err));
  }, []);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    let cancelled = false;

    loadGoogleMapsScript(apiKey || '')
      .then(async () => {
        if (!mapContainerRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) return;
        const { Map3DElement, PopoverElement } = await google.maps.importLibrary('maps3d');
        if (cancelled || !mapContainerRef.current) return;

        const map = new Map3DElement({
          center: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], altitude: 0 },
          range: GLOBE_RANGE_METERS,
          tilt: 0,
          heading: 0,
          mode: mapMode,
          gestureHandling: 'GREEDY',
        });

        const popover = new PopoverElement({
          open: false,
        });
        map.append(popover);

        mapContainerRef.current.replaceChildren(map);
        mapInstanceRef.current = map;
        popoverRef.current = popover;
        setIsMapReady(true);
      })
      .catch(err => {
        console.error(err);
      });

    return () => {
      cancelled = true;
      markerElementsRef.current = [];
      popoverRef.current = null;
      mapInstanceRef.current = null;
      if (mapContainerRef.current) {
        mapContainerRef.current.replaceChildren();
      }
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const google = (window as any).google;
    const map = mapInstanceRef.current as any;

    google.maps.importLibrary('maps3d').then(({ Marker3DInteractiveElement }: any) => {
      markerElementsRef.current.forEach(marker => marker.remove());
      markerElementsRef.current = [];

      vendors.forEach((vendor) => {
        const marker = new Marker3DInteractiveElement({
          position: { lat: vendor.latitude, lng: vendor.longitude, altitude: 0 },
          altitudeMode: 'CLAMP_TO_GROUND',
          label: vendor.name,
        });

        marker.addEventListener('gmp-click', () => {
          if (!popoverRef.current) return;
          popoverRef.current.replaceChildren(buildPopoverContent(vendor));
          popoverRef.current.positionAnchor = marker;
          popoverRef.current.open = true;
        });

        map.append(marker);
        markerElementsRef.current.push(marker);
      });
    });
  }, [vendors, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !centerMapTo || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.center = { lat: centerMapTo[0], lng: centerMapTo[1], altitude: 0 };
    map.range = LOCAL_RANGE_METERS;
    map.tilt = LOCAL_TILT_DEGREES;
  }, [centerMapTo, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    mapInstanceRef.current.mode = mapMode;
  }, [mapMode, isMapReady]);

  const locateUser = () => {
    setFindingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenterMapTo([position.coords.latitude, position.coords.longitude]);
          setFindingLocation(false);
        },
        (error) => {
          console.error("Error finding location: ", error);
          alert("Couldn't find your location. Please check your browser permissions.");
          setFindingLocation(false);
        }
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
      setVendors(prev => [...prev, newVendor]);
      setShowAddModal(false);
      setCenterMapTo([newVendor.latitude, newVendor.longitude]);
    } catch (err) {
      console.error('Failed to add vendor:', err);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] mt-16 z-0">
      <div ref={mapContainerRef} className="w-full h-full" />

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

      <div className="absolute top-6 right-6 z-10 flex rounded-lg border border-slate-300 bg-white/95 p-1 shadow-sm backdrop-blur">
        {(['ROADMAP', 'SATELLITE', 'HYBRID'] as MapMode[]).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setMapMode(mode)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              mapMode === mode
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {mode === 'ROADMAP' ? 'Road' : mode === 'SATELLITE' ? 'Satellite' : 'Hybrid'}
          </button>
        ))}
      </div>

      {showAddModal && (
        <AddMenderModal 
          onClose={() => setShowAddModal(false)} 
          onAdd={handleAddMender} 
        />
      )}
    </div>
  );
}
