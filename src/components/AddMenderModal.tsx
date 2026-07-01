import React, { useCallback, useEffect, useRef, useState } from 'react';
import Select, { type MultiValue, type SingleValue } from 'react-select';
import { createPortal } from 'react-dom';
import { PhoneInput } from 'react-international-phone';
import { Vendor } from '../types';
import { X } from 'lucide-react';
import { createLocationPinIcon, loadGoogleMapsScript } from '../utils/googleMaps';
import { reverseGeocode as geoReverse } from '../utils/geoapify';
import { GeoAutocomplete } from './GeoAutocomplete';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTRY_LEVEL_OPTIONS = ['Menders', 'Member of the public'] as const;

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
  'Applique Repair',
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

const PIN_COLORS: Record<string, string> = {
  Menders: '#2A9D8F',
  'Member of the public': '#F4A261',
};

const getPinColor = (level: string) => PIN_COLORS[level] || '#99C4CB';

const DEFAULT_CENTER: [number, number] = [51.505, -0.09]; // London

// ---------------------------------------------------------------------------
// react-select helpers
// ---------------------------------------------------------------------------

type Option = { value: string; label: string };

const typeOptions: Option[] = TYPE_OPTIONS.map((t) => ({ value: t, label: t }));
const techniqueOptions: Option[] = TECHNIQUE_OPTIONS.map((t) => ({ value: t, label: t }));

const toValues = (opts: MultiValue<Option>): string[] => opts.map((o) => o.value);
const toSingleValue = (opt: SingleValue<Option>): string[] => (opt ? [opt.value] : []);

const selectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: 'rgb(248 250 252)',
    borderColor: 'rgb(226 232 240)',
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': { borderColor: 'rgb(226 232 240)' },
  }),
  menu: (base: any) => ({ ...base, fontSize: '0.875rem', zIndex: 50 }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: 'rgb(241 245 249)',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base: any) => ({ ...base, fontSize: '0.75rem', padding: '0.125rem 0.375rem' }),
  multiValueRemove: (base: any) => ({
    ...base,
    borderRadius: '0 0.375rem 0.375rem 0',
    '&:hover': { backgroundColor: 'rgb(248 113 113)', color: 'white' },
  }),
  placeholder: (base: any) => ({ ...base, color: 'rgb(148 163 184)' }),
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddMenderModalProps {
  onClose: () => void;
  onAdd: (vendor: Omit<Vendor, 'id'>) => void;
  onAddressSelect?: (coords: [number, number], address: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddMenderModal({ onClose, onAdd, onAddressSelect }: AddMenderModalProps) {
  // ---- form fields ----
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [onlinePresence, setOnlinePresence] = useState('');
  const [entryLevel, setEntryLevel] = useState<string>('Menders');
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [regionalTechniques, setRegionalTechniques] = useState<string[]>([]);
  const [reviewStars, setReviewStars] = useState('');
  const [reviewText, setReviewText] = useState('');

  // ---- map / location state ----
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [placesReady, setPlacesReady] = useState(false);

  // ---- refs to survive effect closures ----
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const googleAutocompleteRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref copy of position so GMaps callbacks always read the latest value
  const positionRef = useRef(position);
  positionRef.current = position;

  // ------------------------------------------------------------------
  // Helpers that touch the map directly (not via state)
  // ------------------------------------------------------------------

  const panMapTo = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter({ lat, lng });
    map.setZoom(16);
  }, []);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      // Try Google first
      if ((window as any).google?.maps) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
          if (status === 'OK' && results?.[0]?.formatted_address) {
            setAddress(results[0].formatted_address);
          } else {
            // Fall back to Geoapify
            geoReverse(lat, lng).then((addr) => { if (addr) setAddress(addr); });
          }
        });
      } else {
        // Google not loaded — use Geoapify directly
        geoReverse(lat, lng).then((addr) => { if (addr) setAddress(addr); });
      }
    },
    [],
  );

  // Central "go here" action used by autocomplete, click, and drag
  const goToLocation = useCallback(
    (lat: number, lng: number, addr?: string) => {
      setPosition([lat, lng]);
      if (addr) {
        setAddress(addr);
      } else {
        reverseGeocode(lat, lng);
      }
      panMapTo(lat, lng);
    },
    [panMapTo, reverseGeocode],
  );

  // ------------------------------------------------------------------
  // Effect 1 — Geolocation
  // ------------------------------------------------------------------
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setPosition(DEFAULT_CENTER),
      );
    } else {
      setPosition(DEFAULT_CENTER);
    }
  }, []);

  // ------------------------------------------------------------------
  // Effect 2 — Google Maps initialisation
  // ------------------------------------------------------------------
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    setMapError(null);

    // Set up the global auth-failure callback
    const onGmAuthFailure = () =>
      setMapError(
        'Google Maps authentication failed. Check your API key, billing, and domain restrictions.',
      );
    (window as any).gm_authFailure = onGmAuthFailure;

    let cancelled = false;

    loadGoogleMapsScript(apiKey || '')
      .then(async () => {
        if (cancelled || !mapContainerRef.current) return;
        const g = (window as any).google;
        if (!g?.maps) return;

        // Ensure Places is available
        try { await g.maps.importLibrary('places'); } catch { /* ok */ }

        // ---- Create the mini map ----
        const initial = positionRef.current || DEFAULT_CENTER;
        const map = new g.maps.Map(mapContainerRef.current, {
          center: { lat: initial[0], lng: initial[1] },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;

        // ---- Place Autocomplete ----
        const hasPlaces = !!g.maps.places?.Autocomplete;
        if (hasPlaces && addressInputRef.current) {
          const autocomplete = new g.maps.places.Autocomplete(addressInputRef.current, {
            fields: ['formatted_address', 'geometry', 'name'],
          });
          googleAutocompleteRef.current = autocomplete;
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            const location = place?.geometry?.location;
            if (!location) {
              setMapError('Unable to resolve the selected address. Try another suggestion.');
              return;
            }

            const lat = location.lat();
            const lng = location.lng();
            const addr = place.formatted_address || place.name || addressInputRef.current?.value || '';
            setAddress(addr);
            setPosition([lat, lng]);
            panMapTo(lat, lng);
            setMapError(null);
            onAddressSelect?.([lat, lng], addr);
          });
          setPlacesReady(true);
        }

        // ---- Marker (draggable) ----
        const marker = new g.maps.Marker({
          map,
          position: { lat: initial[0], lng: initial[1] },
          icon: createLocationPinIcon(g.maps, getPinColor('Menders'), '#ffffff'),
          draggable: true,
        });
        markerRef.current = marker;

        // ---- Map click ----
        map.addListener('click', (evt: any) => {
          if (!evt.latLng) return;
          const lat = evt.latLng.lat();
          const lng = evt.latLng.lng();
          setPosition([lat, lng]);
          panMapTo(lat, lng);
          reverseGeocode(lat, lng);
        });

        // ---- Marker drag ----
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          setPosition([lat, lng]);
          panMapTo(lat, lng);
          reverseGeocode(lat, lng);
        });
      })
      .catch((err: any) => {
        if (cancelled) return;
        setMapError(err instanceof Error ? err.message : 'Failed to load Google Maps.');
      });

    return () => {
      cancelled = true;
      if ((window as any).gm_authFailure === onGmAuthFailure) {
        (window as any).gm_authFailure = undefined;
      }
      googleAutocompleteRef.current = null;
      markerRef.current = null;
      mapRef.current = null;
      setPlacesReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Effect 3 — sync marker position + colour when position/entryLevel changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!position || !markerRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    const latLng = { lat: position[0], lng: position[1] };
    markerRef.current.setPosition(latLng);
    markerRef.current.setIcon(
      createLocationPinIcon(g.maps, getPinColor(entryLevel), '#ffffff'),
    );
  }, [position, entryLevel]);

  // ------------------------------------------------------------------
  // Form helpers
  // ------------------------------------------------------------------

  const resetReviewFields = () => {
    setReviewStars('');
    setReviewText('');
  };

  const onEntryLevelChange = (level: string) => {
    setEntryLevel(level);
    if (level === 'Menders') resetReviewFields();
  };

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!name.trim()) {
      setSubmitError('Name is required.');
      return;
    }

    if (!position || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
      setSubmitError('Please select a location on the map — click or drag the pin.');
      return;
    }

    const resolvedAddress = address.trim() || 'Location selected on map';
    const reviewScore = Number(reviewStars);
    const normalizedReview = Number.isFinite(reviewScore) ? Math.min(5, Math.max(0, reviewScore)) : 0;

    onAdd({
      name,
      category: entryLevel,
      entry_level: entryLevel,
      types,
      address: resolvedAddress,
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
      rating_count:
        entryLevel === 'Member of the public' && (reviewText || normalizedReview > 0) ? 1 : 0,
      photos: JSON.stringify({
        entry_level: entryLevel,
        types,
        categories,
        regional_techniques: regionalTechniques,
        online_presence: onlinePresence,
        review_text: reviewText,
      }),
    });
  };

  // ------------------------------------------------------------------
  // Derived UI flags
  // ------------------------------------------------------------------

  // Show the fallback text input when Places isn't available OR we hit an error
  const showFallbackInput = !placesReady;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const modalContent = (
    <div className="fixed inset-0 z-[3200] flex items-center justify-center p-3 bg-gray-900/40 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[min(84vh,760px)] w-[min(95vw,1080px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Add New Mender</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-5 py-4 md:grid-cols-2">
            {/* ==================== LEFT COLUMN ==================== */}
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria's Shoe Repair"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                />
              </div>

              {/* Entry Level */}
              <div>
                <p className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Entry Level *
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ENTRY_LEVEL_OPTIONS.map((level) => (
                    <label key={level} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5">
                      <input
                        type="radio"
                        name="entry-level"
                        value={level}
                        checked={entryLevel === level}
                        onChange={() => onEntryLevelChange(level)}
                      />
                      <span className="text-sm text-slate-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Type</label>
                <Select
                  options={typeOptions}
                  value={typeOptions.find((o) => types.includes(o.value)) ?? null}
                  onChange={(opt) => setTypes(toSingleValue(opt))}
                  placeholder="Select a type..."
                  isClearable
                  styles={selectStyles}
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Tel Number
                </label>
                <PhoneInput
                  defaultCountry="gb"
                  value={phone}
                  onChange={(nextPhone) => setPhone(nextPhone)}
                  placeholder="Phone"
                  inputProps={{ id: 'phone', name: 'phone' }}
                  className="mymenders-phone-input"
                  inputClassName="mymenders-phone-input__field"
                  countrySelectorStyleProps={{
                    buttonClassName: 'mymenders-phone-input__country-button',
                    dropdownStyleProps: {
                      className: 'mymenders-phone-input__dropdown',
                    },
                  }}
                />
              </div>

              {/* Social */}
              <div>
                <label htmlFor="online" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Social
                </label>
                <input
                  id="online"
                  type="text"
                  value={onlinePresence}
                  onChange={(e) => setOnlinePresence(e.target.value)}
                  placeholder="Website or social link"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                />
              </div>

              {/* Review (Member of the public only) */}
              {entryLevel === 'Member of the public' && (
                <>
                  <div>
                    <label htmlFor="review-stars" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                      Star rating (0–5)
                    </label>
                    <input
                      id="review-stars"
                      type="number"
                      min={0}
                      max={5}
                      step={0.5}
                      value={reviewStars}
                      onChange={(e) => setReviewStars(e.target.value)}
                      placeholder="4.5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                    />
                  </div>
                  <div>
                    <label htmlFor="review-text" className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                      Written review
                    </label>
                    <textarea
                      id="review-text"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Leave your feedback"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                    />
                  </div>
                </>
              )}

            </div>

            {/* ==================== RIGHT COLUMN ==================== */}
            <div className="space-y-3">
              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Address
                </label>

                {!showFallbackInput ? (
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  />
                ) : (
                  <GeoAutocomplete
                    value={address}
                    onChange={(val) => setAddress(val)}
                    onSelect={(s) => goToLocation(s.lat, s.lng, s.formatted)}
                    placeholder="Street address"
                  />
                )}

                {mapError && <p className="text-xs text-amber-600 mt-1">{mapError}</p>}
              </div>

              {/* Mini Map */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Location *
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Drag the pin or click the map to set a precise location.
                </p>
                <div className="h-32 rounded-lg overflow-hidden border border-slate-200 relative z-0 lg:h-36">
                  <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Categories */}
              <div>
                <p className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-2">Categories</p>
                {CATEGORY_OPTIONS.map((group) => (
                  <div key={group.label} className="mb-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{group.label}</p>
                    <Select
                      isMulti
                      options={group.items.map((item) => ({ value: item, label: item }))}
                      value={group.items
                        .filter((item) => categories.includes(item))
                        .map((item) => ({ value: item, label: item }))}
                      onChange={(opts) => {
                        const picked = toValues(opts);
                        const others = categories.filter((c) => !group.items.includes(c));
                        setCategories([...others, ...picked]);
                      }}
                      placeholder={`Select ${group.label.toLowerCase()}...`}
                      styles={selectStyles}
                    />
                  </div>
                ))}
              </div>

              {/* Regional Techniques */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">
                  Regional techniques
                </label>
                <Select
                  isMulti
                  options={techniqueOptions}
                  value={techniqueOptions.filter((o) => regionalTechniques.includes(o.value))}
                  onChange={(opts) => setRegionalTechniques(toValues(opts))}
                  placeholder="Select techniques..."
                  styles={selectStyles}
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
            <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-slate-800 shadow-lg shadow-brand-light transition-colors hover:bg-brand-hover"
            >
              Publish to Map
            </button>
            </div>
            {submitError && <p className="mt-3 text-xs text-amber-700">{submitError}</p>}
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
