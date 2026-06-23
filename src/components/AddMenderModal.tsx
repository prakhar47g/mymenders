import React, { useEffect, useRef, useState } from 'react';
import { Vendor } from '../types';
import { X } from 'lucide-react';
import { createLocationPinIcon, loadGoogleMapsScript } from '../utils/googleMaps';

interface AddMenderModalProps {
  onClose: () => void;
  onAdd: (vendor: Omit<Vendor, 'id'>) => void;
}

const ENTRY_LEVEL_OPTIONS = ['Menders', 'Member of the public'];

const TYPE_OPTIONS = ['Home', 'Itinerant', 'Shop', 'Workshop', 'Chain', 'Dry-clean'];

const CATEGORY_OPTIONS = [
  {
    label: 'CLOTHING',
    items: [
      'Alterations and Customising',
      'Bridal & Occasion Wear Alterations',
      'Darning',
      'Denim Repairs',
      'Embroidery & Decorative Repairs',
      'Machine & Hand Mending basics',
      'Patching',
      'Re-dyeing & Surface Treatments',
      'Reinforcing',
      'Seam Repairs / Stitching',
      'Tailoring Repairs',
      'Upcycling & Reconstruction',
    ],
  },
  {
    label: 'ACCESSORIES',
    items: ['Bags and Luggage', 'Shoes'],
  },
];

const TECHNIQUE_OPTIONS = [
  'Appliqué Repair',
  'Boro',
  'Darning',
  'Kantha Repair',
  'Kintsugi-inspired Textile Repair',
  'Kogin Stitch',
  'Needle Weaving',
  'Patchwork Mending',
  'Rafu',
  'Reweaving',
  'Sashiko',
  'Swiss Darning',
];

const pinColourByEntryLevel: Record<string, string> = {
  Menders: '#2A9D8F',
  'Member of the public': '#F4A261',
};

const getPinColor = (entryLevel: string) => {
  return pinColourByEntryLevel[entryLevel] || '#99C4CB';
};

export function AddMenderModal({ onClose, onAdd }: AddMenderModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [onlinePresence, setOnlinePresence] = useState('');
  const [entryLevel, setEntryLevel] = useState<(typeof ENTRY_LEVEL_OPTIONS)[number]>('Menders');
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [regionalTechniques, setRegionalTechniques] = useState<string[]>([]);
  const [reviewStars, setReviewStars] = useState('');
  const [reviewText, setReviewText] = useState('');
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
          // Gracefully fail if geolocation is denied.
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
        icon: createLocationPinIcon(google.maps, getPinColor(entryLevel), '#ffffff'),
        draggable: false,
      });
    } else {
      pinMarkerRef.current.setPosition({ lat: position[0], lng: position[1] });
      pinMarkerRef.current.setIcon(createLocationPinIcon(google.maps, getPinColor(entryLevel), '#ffffff'));
    }

    if (!clickListenerRef.current) {
      clickListenerRef.current = map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setPosition([lat, lng]);
      });
    }
  }, [position, zoom, isMapReady, locateCenter, entryLevel]);

  const toggleInList = (value: string, currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentList.includes(value)) {
      setList(currentList.filter((item) => item !== value));
    } else {
      setList([...currentList, value]);
    }
  };

  const resetReviewFields = () => {
    setReviewStars('');
    setReviewText('');
  };

  const handleEntryLevelChange = (value: (typeof ENTRY_LEVEL_OPTIONS)[number]) => {
    setEntryLevel(value);
    if (value === 'Menders') {
      resetReviewFields();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || position[0] === 0 || !types.length) return;

    const reviewScore = Number(reviewStars);
    const normalizedReview = Number.isFinite(reviewScore) ? Math.min(5, Math.max(0, reviewScore)) : 0;

    const metadata = {
      entry_level: entryLevel,
      types,
      categories,
      regional_techniques: regionalTechniques,
      online_presence: onlinePresence,
      review_text: reviewText,
    };

    onAdd({
      name,
      category: entryLevel,
      entry_level: entryLevel,
      types,
      address: address || undefined,
      latitude: position[0],
      longitude: position[1],
      phone,
      contact: phone,
      website: onlinePresence || undefined,
      online_presence: onlinePresence,
      categories,
      regional_techniques: regionalTechniques,
      review_text: reviewText,
      rating: entryLevel === 'Member of the public' ? normalizedReview : 0,
      rating_count: entryLevel === 'Member of the public' && (reviewText || normalizedReview > 0) ? 1 : 0,
      photos: JSON.stringify(metadata),
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
            <label htmlFor="name" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Name *</label>
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
            <p className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Entry Level *</p>
            <div className="grid grid-cols-2 gap-2">
              {ENTRY_LEVEL_OPTIONS.map(level => (
                <label key={level} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input
                    type="radio"
                    name="entry-level"
                    value={level}
                    checked={entryLevel === level}
                    onChange={() => handleEntryLevelChange(level as (typeof ENTRY_LEVEL_OPTIONS)[number])}
                  />
                  <span className="text-sm text-slate-700">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Type * (tick multiple)</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(type => (
                <label key={type} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    value={type}
                    checked={types.includes(type)}
                    onChange={() => toggleInList(type, types, setTypes)}
                  />
                  <span className="text-sm text-slate-700">{type}</span>
                </label>
              ))}
            </div>
            {!types.length ? (
              <p className="text-xs text-amber-600 mt-1">Please tick at least one type.</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Address *</label>
            <input
              id="address"
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Tel Number *</label>
            <input
              id="phone"
              type="text"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="online" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Online Presence</label>
            <input
              id="online"
              type="text"
              value={onlinePresence}
              onChange={e => setOnlinePresence(e.target.value)}
              placeholder="Website or social link"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>

          {ENTRY_LEVEL_OPTIONS.includes(entryLevel) && entryLevel === 'Member of the public' && (
            <>
              <div>
                <label htmlFor="review-stars" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Star system (0 to 5)</label>
                <input
                  id="review-stars"
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  value={reviewStars}
                  onChange={e => setReviewStars(e.target.value)}
                  placeholder="4.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                />
              </div>

              <div>
                <label htmlFor="review-text" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Written review</label>
                <textarea
                  id="review-text"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Leave your feedback"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                />
              </div>
            </>
          )}

          <div>
            <p className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-2">Categories (tick multiple)</p>
            {CATEGORY_OPTIONS.map(group => (
              <div key={group.label} className="mb-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{group.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(category => (
                    <label key={category} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input
                        type="checkbox"
                        value={category}
                        checked={categories.includes(category)}
                        onChange={() => toggleInList(category, categories, setCategories)}
                      />
                      <span className="text-sm text-slate-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-2">Regional techniques (tick multiple)</p>
            <div className="grid grid-cols-2 gap-2">
              {TECHNIQUE_OPTIONS.map(technique => (
                <label key={technique} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    value={technique}
                    checked={regionalTechniques.includes(technique)}
                    onChange={() => toggleInList(technique, regionalTechniques, setRegionalTechniques)}
                  />
                  <span className="text-sm text-slate-700">{technique}</span>
                </label>
              ))}
            </div>
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
