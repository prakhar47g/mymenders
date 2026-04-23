import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Plus, MapPin } from 'lucide-react';
import { Vendor } from '../types';
import { AddMenderModal } from '../components/AddMenderModal';

// Shared marker icon
const createMenderIcon = () => {
    return L.divIcon({
      html: `<div class="w-10 h-10 flex items-center justify-center drop-shadow-md translate-y-[-50%]"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#99C4CB" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg></div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
};

function MapController({ centerPos }: { centerPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (centerPos) {
      map.flyTo(centerPos, 13, { duration: 1.5 });
    }
  }, [centerPos, map]);
  return null;
}

export function MapPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [centerMapTo, setCenterMapTo] = useState<[number, number] | null>(null);
  const [findingLocation, setFindingLocation] = useState(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/vendors`)
      .then(res => res.json())
      .then(data => setVendors(data))
      .catch(err => console.error('Failed to fetch vendors:', err));
  }, []);

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
      <MapContainer 
        center={[20, 0]} 
        zoom={3} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false} // Will add custom control pos if needed, default is ok but bottom right can be better
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {vendors.map((vendor) => (
          <Marker 
            key={vendor.id} 
            position={[vendor.latitude, vendor.longitude]} 
            icon={createMenderIcon()}
          >
            <Popup className="rounded-2xl overflow-hidden shadow-2xl border-0 p-2">
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">{vendor.name}</h3>
                {vendor.phone && (
                  <p className="text-sm text-slate-500 mb-2 font-medium">{vendor.phone}</p>
                )}
                <div className="h-px w-full bg-slate-200 my-2" />
                <p className="text-sm text-slate-600 leading-relaxed">{vendor.category}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapController centerPos={centerMapTo} />
      </MapContainer>

      {/* Floating Action Buttons */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-[1000]">
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
        />
      )}
    </div>
  );
}
