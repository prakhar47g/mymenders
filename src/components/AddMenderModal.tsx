import React, { useEffect, useRef, useState } from 'react';
import { Vendor } from '../types';
import { X } from 'lucide-react';
import { createLocationPinIcon, loadGoogleMapsScript } from '../utils/googleMaps';

interface AddMenderModalProps {
  onClose: () => void;
  onAdd: (vendor: Omit<Vendor, 'id'>) => void;
}

export function AddMenderModal({ onClose, onAdd }: AddMenderModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Other');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<[number, number]>([51.505, -0.09]); // Default position, ideally user's current loc
  const [locateCenter, setLocateCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(2);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          setLocateCenter(newPos);
          setZoom(13);
        },
        () => {
          // Gracefully fail if geolocation is denied
        }
      );
    }
  }, []);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    loadGoogleMapsScript(apiKey || '')
      .then(() => {
        if (!mapContainerRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: position[0], lng: position[1] },
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const google = (window as any).google;
    const map = mapInstanceRef.current as any;

    if (locateCenter) {
      map.setCenter({ lat: locateCenter[0], lng: locateCenter[1] });
      map.setZoom(13);
      setLocateCenter(null);
    } else {
      map.setCenter({ lat: position[0], lng: position[1] });
      map.setZoom(zoom);
    }

    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new google.maps.Marker({
        map,
        position: { lat: position[0], lng: position[1] },
        icon: createLocationPinIcon(google.maps, '#99C4CB', '#99C4CB'),
        draggable: false,
      });
    } else {
      pinMarkerRef.current.setPosition({ lat: position[0], lng: position[1] });
    }

    if (!clickListenerRef.current) {
      clickListenerRef.current = map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setPosition([lat, lng]);
      });
    }
  }, [position, zoom, isMapReady, locateCenter]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || position[0] === 0) return;
    
    onAdd({
      name,
      phone,
      category,
      address: address || undefined,
      latitude: position[0],
      longitude: position[1],
      rating: 0,
      rating_count: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-0">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-bold text-slate-900">Add New Mender</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Vendor Name *</label>
            <input 
              id="name"
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Maria's Shoe Repair"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Category *</label>
            <select 
              id="category"
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            >
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Furniture">Furniture</option>
              <option value="Shoes">Shoes</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Contact (Optional)</label>
            <input 
              id="phone"
              type="text" 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone, email, or website"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Address (Optional)</label>
            <input 
              id="address"
              type="text" 
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Location *</label>
            <p className="text-xs text-slate-400 mb-2">Drag/pan the map and click to drop a pin.</p>
            <div className="h-40 rounded-lg overflow-hidden border border-slate-200 relative z-0">
              <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          
          <div className="mt-6 flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-brand text-slate-800 rounded-xl font-bold text-sm shadow-lg shadow-brand-light hover:bg-brand-hover transition-colors"
            >
              Publish to Map
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
