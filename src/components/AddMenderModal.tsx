import React, { useCallback, useEffect, useRef, useState } from 'react';
import Select, { type GroupBase, type MultiValue, type SingleValue } from 'react-select';
import { createPortal } from 'react-dom';
import { PhoneInput } from 'react-international-phone';
import { Rating as ReactRating, ThinRoundedStar } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';
import { Vendor } from '../types';
import { X } from 'lucide-react';
import { createLocationPinIcon, loadGoogleMapsScript } from '../utils/googleMaps';
import { reverseGeocode as geoReverse } from '../utils/geoapify';
import { GeoAutocomplete } from './GeoAutocomplete';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTRY_LEVEL_OPTIONS = ['Menders', 'Member of the public'] as const;
type EntryLevelOption = (typeof ENTRY_LEVEL_OPTIONS)[number];
const MENDER_ICON_URL =
  'https://img.icons8.com/external-kmg-design-outline-color-kmg-design/64/external-sewing-sewing-kmg-design-outline-color-kmg-design-3.png';
const CONTRIBUTOR_ICON_URL = 'https://img.icons8.com/office/80/map-marker.png';

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

type EntryLevelMeta = {
  iconSrc: string;
  title: string;
  description: string;
  activePanelClasses: string;
  activeTitleClasses: string;
};

const ENTRY_LEVEL_META: Record<EntryLevelOption, EntryLevelMeta> = {
  Menders: {
    iconSrc: MENDER_ICON_URL,
    title: 'I am a Mender',
    description: 'Create a service profile with your details, specialties and map location.',
    activePanelClasses: 'border-brand-hover bg-brand',
    activeTitleClasses: 'text-[#222222]',
  },
  'Member of the public': {
    iconSrc: CONTRIBUTOR_ICON_URL,
    title: 'I am a contributor',
    description: 'Share a recommendation, review or local tip from the community.',
    activePanelClasses: 'border-brand-hover bg-brand',
    activeTitleClasses: 'text-[#222222]',
  },
};

const getPinColor = (level: string) => PIN_COLORS[level] || '#99C4CB';

const DEFAULT_CENTER: [number, number] = [51.505, -0.09]; // London

// ---------------------------------------------------------------------------
// react-select helpers
// ---------------------------------------------------------------------------

type Option = { value: string; label: string };
type CategoryGroup = GroupBase<Option>;

const typeOptions: Option[] = TYPE_OPTIONS.map((t) => ({ value: t, label: t }));
const categoryOptions: CategoryGroup[] = CATEGORY_OPTIONS.map((group) => ({
  label: group.label,
  options: group.items.map((item) => ({ value: item, label: item })),
}));
const techniqueOptions: Option[] = TECHNIQUE_OPTIONS.map((t) => ({ value: t, label: t }));
const reviewItemLabels = ['Rate 1 star', 'Rate 2 stars', 'Rate 3 stars', 'Rate 4 stars', 'Rate 5 stars'];

const toValues = (opts: MultiValue<Option>): string[] => opts.map((o) => o.value);
const toSingleValue = (opt: SingleValue<Option>): string[] => (opt ? [opt.value] : []);

const selectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: '#ffffff',
    borderColor: '#e6e0d6',
    borderRadius: '0.75rem',
    minHeight: '2.75rem',
    fontSize: '0.875rem',
    boxShadow: 'none',
    color: '#171b17',
    '&:hover': { borderColor: '#d5cdc0' },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#ffffff',
    borderRadius: '0.875rem',
    boxShadow: '0 12px 28px rgba(54, 45, 35, 0.1)',
    fontSize: '0.875rem',
    overflow: 'hidden',
    zIndex: 50,
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 3300 }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: '#f7f4ed',
    border: '1px solid #e6e0d6',
    borderRadius: '999px',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: '#3d403b',
    fontSize: '0.75rem',
    padding: '0.125rem 0.5rem',
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    borderRadius: '0 999px 999px 0',
    '&:hover': { backgroundColor: '#1f241f', color: '#ffffff' },
  }),
  placeholder: (base: any) => ({ ...base, color: '#8a877d' }),
  singleValue: (base: any) => ({ ...base, color: '#171b17' }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused || state.isSelected ? '#f7f4ed' : '#ffffff',
    color: '#171b17',
    '&:active': { backgroundColor: '#ebe4d8' },
  }),
};

const reviewRatingStyles = {
  itemShapes: ThinRoundedStar,
  itemStrokeWidth: 1.8,
  activeFillColor: '#F4A261',
  activeStrokeColor: '#F4A261',
  inactiveFillColor: '#fff7ed',
  inactiveStrokeColor: '#fdba74',
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
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // ---- map / location state ----
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [placesReady, setPlacesReady] = useState(false);
  const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : undefined;

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
    setReviewStars(0);
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
      setSubmitError('Shop name is required.');
      return;
    }

    if (!position || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
      setSubmitError('Please select a location on the map — click or drag the pin.');
      return;
    }

    const resolvedAddress = address.trim() || 'Location selected on map';
    const normalizedReview = Number.isFinite(reviewStars) ? Math.min(5, Math.max(0, reviewStars)) : 0;

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
    <div className="fixed inset-0 z-[3200] flex items-center justify-center bg-[#171b17]/36 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[min(92vh,900px)] w-[min(95vw,1080px)] flex-col overflow-hidden rounded-[1.25rem] border border-[#e6e0d6] bg-[#f1f3f1] shadow-[0_18px_40px_rgba(54,45,35,0.12)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e6e0d6] bg-[#fffdf8] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#171b17] mymenders-heading-font">Add a Mender</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#68665f] transition-colors hover:bg-[#f7f4ed] hover:text-[#171b17]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              {/* ==================== LEFT COLUMN ==================== */}
              <div className="space-y-4">
              <fieldset>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ENTRY_LEVEL_OPTIONS.map((level) => {
                    const meta = ENTRY_LEVEL_META[level];
                    const isSelected = entryLevel === level;

                    return (
                      <label key={level} className="block cursor-pointer">
                        <input
                          type="radio"
                          name="entry-level"
                          value={level}
                          checked={isSelected}
                          onChange={() => onEntryLevelChange(level)}
                          className="peer sr-only"
                        />
                        <span
                          className={`flex min-h-[96px] items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-light peer-focus-visible:ring-offset-2 ${
                            isSelected
                              ? meta.activePanelClasses
                              : 'border-[#e6e0d6] bg-white grayscale hover:border-[#d5cdc0] hover:bg-[#f7f4ed]'
                          }`}
                        >
                          <img
                            src={meta.iconSrc}
                            alt=""
                            aria-hidden="true"
                              className={`mt-0.5 h-[43px] w-[43px] shrink-0 object-contain object-top transition-all duration-150 ${
                                isSelected ? 'opacity-100' : 'opacity-55'
                              }`}
                            />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-sm font-normal ${
                                isSelected ? meta.activeTitleClasses : 'text-[#171b17]'
                              }`}
                            >
                              {meta.title}
                            </span>
                            <span className={`mt-1 block text-xs leading-[1.45] ${isSelected ? 'text-[#2f3e39]' : 'text-[#68665f]'}`}>
                              {meta.description}
                            </span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Shop Name */}
              <div>
                <label htmlFor="name" className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">
                  Mender / Studio Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria's Shoe Repair"
                  className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
                />
              </div>

              {/* Type + Phone */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">Studio Type</label>
                  <Select
                    options={typeOptions}
                    value={typeOptions.find((o) => types.includes(o.value)) ?? null}
                    onChange={(opt) => setTypes(toSingleValue(opt))}
                    placeholder="Select studio type..."
                    isClearable
                    menuPortalTarget={selectMenuPortalTarget}
                    menuPosition="fixed"
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">
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
              </div>

              {/* Social */}
              <div>
                <label htmlFor="online" className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">
                  Social
                </label>
                <input
                  id="online"
                  type="text"
                  value={onlinePresence}
                  onChange={(e) => setOnlinePresence(e.target.value)}
                  placeholder="Website or social link"
                  className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
                />
              </div>

              {/* Categories */}
              <div>
                <p className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">Categories</p>
                <Select
                  isMulti
                  options={categoryOptions}
                  value={categoryOptions
                    .flatMap((group) => group.options)
                    .filter((option) => categories.includes(option.value))}
                  onChange={(opts) => setCategories(toValues(opts))}
                  placeholder="Select categories..."
                  menuPortalTarget={selectMenuPortalTarget}
                  menuPosition="fixed"
                  styles={selectStyles}
                />
              </div>

              {/* Regional Techniques */}
              <div>
                <label className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">
                  Regional techniques
                </label>
                <Select
                  isMulti
                  options={techniqueOptions}
                  value={techniqueOptions.filter((o) => regionalTechniques.includes(o.value))}
                  onChange={(opts) => setRegionalTechniques(toValues(opts))}
                  placeholder="Select techniques..."
                  menuPortalTarget={selectMenuPortalTarget}
                  menuPosition="fixed"
                  styles={selectStyles}
                />
              </div>

              </div>

              {/* ==================== RIGHT COLUMN ==================== */}
              <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">
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
                    className="mymenders-field w-full border px-3 py-2 text-sm text-[#171b17] outline-none"
                  />
                ) : (
                  <GeoAutocomplete
                    value={address}
                    onChange={(val) => setAddress(val)}
                    onSelect={(s) => goToLocation(s.lat, s.lng, s.formatted)}
                    placeholder="Street address"
                  />
                )}

                {mapError && <p className="mt-2 text-xs text-[#9b5f1d]">{mapError}</p>}
              </div>

              {/* Mini Map */}
              <div>
                <label className="add-mender-modal-label mb-1.5 block text-[11px] font-medium uppercase">
                  Location
                </label>
                <div className="relative z-0 h-48 overflow-hidden rounded-2xl border border-[#e6e0d6] lg:h-56">
                  <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Review (Member of the public only) */}
              {entryLevel === 'Member of the public' && (
                <>
                  <div>
                    <span
                      id="review-stars-label"
                      className="add-mender-modal-label mb-2 block text-[11px] font-medium uppercase"
                    >
                      Review
                    </span>
                    <div>
                      <ReactRating
                        id="review-stars"
                        style={{ maxWidth: 180 }}
                        value={reviewStars}
                        onChange={setReviewStars}
                        transition="colors"
                        spaceBetween="small"
                        itemStyles={reviewRatingStyles}
                        visibleLabelId="review-stars-label"
                        invisibleItemLabels={reviewItemLabels}
                      />
                      <textarea
                        id="review-text"
                        aria-label="Written review"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Leave your feedback"
                        rows={2}
                        className="mymenders-field mt-3 w-full border px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
            </div>
            <div className="border-t border-[#e6e0d6] bg-[#f1f3f1] px-6 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 flex-1 rounded-full border border-[#e6e0d6] bg-white px-5 text-sm font-medium text-[#3d403b] transition-colors hover:bg-[#f7f4ed]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 flex-1 rounded-full bg-[#1f241f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#343a33]"
                >
                  Publish to Map
                </button>
              </div>
              {submitError && <p className="mt-3 text-xs text-[#8b4e16]">{submitError}</p>}
            </div>
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
