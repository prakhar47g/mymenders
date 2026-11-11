import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, FrameSelect as VectorSquare } from 'iconoir-react';
import Select, { type GroupBase, type MultiValue, type SingleValue } from 'react-select';
import { PhoneInput, type CountryIso2 } from 'react-international-phone';
import { Rating as ReactRating, ThinRoundedStar } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';
import { Vendor } from '../types';
import { createLocationPinIcon, loadGoogleMapsScript } from '../utils/googleMaps';
import { reverseGeocode as geoReverse, reverseGeocodeDetails } from '../utils/geoapify';
import { GeoAutocomplete } from '../components/GeoAutocomplete';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../components/ui/input-group';
import {
  getGroupedTaxonomyOptions,
  getStudioTypeColor,
  getTaxonomyOptions,
} from '../../shared/vendorTaxonomy.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTRY_LEVEL_OPTIONS = ['Menders', 'Member of the public'] as const;
type EntryLevelOption = (typeof ENTRY_LEVEL_OPTIONS)[number];

type EntryLevelMeta = {
  title: string;
  description: string;
  activePanelClasses: string;
};

const ENTRY_LEVEL_META: Record<EntryLevelOption, EntryLevelMeta> = {
  Menders: {
    title: "I'm a mender",
    description: 'List your own work so people can find you.',
    activePanelClasses: 'add-mender-role--selected',
  },
  'Member of the public': {
    title: 'I know a mender',
    description: 'Recommend someone you trust to fix things.',
    activePanelClasses: 'add-mender-role--selected',
  },
};

const DEFAULT_CENTER: [number, number] = [51.505, -0.09]; // London
const DEFAULT_PHONE_COUNTRY: CountryIso2 = 'gb';

const getBrowserCountry = (): CountryIso2 => {
  if (typeof navigator === 'undefined') return DEFAULT_PHONE_COUNTRY;
  const region = navigator.language?.split('-')[1]?.trim();
  return region && /^[a-z]{2}$/i.test(region) ? (region.toLowerCase() as CountryIso2) : DEFAULT_PHONE_COUNTRY;
};

const getCountryFromCoordinates = async (lat: number, lng: number): Promise<CountryIso2 | null> => {
  const result = await reverseGeocodeDetails(lat, lng);
  const countryCode = result?.countryCode?.trim().toLowerCase();
  return countryCode && /^[a-z]{2}$/.test(countryCode) ? (countryCode as CountryIso2) : null;
};

const coordinatesMatch = (
  first: [number, number] | null,
  second: [number, number] | null,
) => Boolean(first && second && first[0] === second[0] && first[1] === second[1]);

const normalizeSocialProfile = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const isUrlOrDomainPath =
    /^[a-z][a-z\d+.-]*:/i.test(trimmed) ||
    trimmed.startsWith('//') ||
    trimmed.includes('/') ||
    (!trimmed.startsWith('@') && /^[^\s.]+\.[a-z]{2,}(?:$|[?#])/i.test(trimmed));

  if (isUrlOrDomainPath) return trimmed;

  const handle = trimmed.replace(/^@/, '');
  return handle ? `https://instagram.com/${handle}` : '';
};

// ---------------------------------------------------------------------------
// react-select helpers
// ---------------------------------------------------------------------------

type Option = { value: string; label: string };
type CategoryGroup = GroupBase<Option>;

const toSelectOption = (option: { id: string; label: string }): Option => ({
  value: option.id,
  label: option.label,
});

const typeOptions: Option[] = getTaxonomyOptions('types').map(toSelectOption);
const categoryOptions: CategoryGroup[] = getGroupedTaxonomyOptions('categories').map((group: {
  label: string;
  options: Array<{ id: string; label: string }>;
}) => ({
  label: group.label,
  options: group.options.map(toSelectOption),
}));
const techniqueOptions: Option[] = getTaxonomyOptions('regional_techniques').map(toSelectOption);
const reviewItemLabels = ['Rate 1 star', 'Rate 2 stars', 'Rate 3 stars', 'Rate 4 stars', 'Rate 5 stars'];

const toValues = (opts: MultiValue<Option>): string[] => opts.map((o) => o.value);
const toSingleValue = (opt: SingleValue<Option>): string[] => (opt ? [opt.value] : []);

// Inline styles also theme menus portalled to document.body, only for /add.
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base, backgroundColor: '#29292b', borderColor: state.isFocused ? '#f4f2eb' : '#5b5b5d',
    borderRadius: '10px', minHeight: '40px', fontSize: '0.8125rem',
    boxShadow: state.isFocused ? '0 0 0 1px #f4f2eb' : 'none',
    color: '#f4f2eb', '&:hover': { borderColor: '#c4c2bc' },
  }),
  input: (base: any) => ({ ...base, color: '#f4f2eb' }),
  menu: (base: any) => ({
    ...base, backgroundColor: '#29292b', color: '#f4f2eb', border: '1px solid #5b5b5d',
    borderRadius: '12px', boxShadow: '0 12px 28px rgba(0,0,0,.22)',
    fontSize: '0.875rem', overflow: 'hidden', zIndex: 50,
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 3300, colorScheme: 'dark' }),
  multiValue: (base: any) => ({ ...base, backgroundColor: '#414143', borderRadius: '6px' }),
  multiValueLabel: (base: any) => ({ ...base, color: '#f4f2eb', fontSize: '0.75rem' }),
  multiValueRemove: (base: any) => ({
    ...base, color: '#f4f2eb', '&:hover': { backgroundColor: '#626264', color: '#fff' },
  }),
  placeholder: (base: any) => ({ ...base, color: '#c4c2bc' }),
  singleValue: (base: any) => ({ ...base, color: '#f4f2eb' }),
  groupHeading: (base: any) => ({ ...base, color: '#c4c2bc' }),
  indicatorSeparator: (base: any) => ({ ...base, backgroundColor: '#5b5b5d' }),
  dropdownIndicator: (base: any) => ({ ...base, color: '#c4c2bc', '&:hover': { color: '#fff' } }),
  clearIndicator: (base: any) => ({ ...base, color: '#c4c2bc', '&:hover': { color: '#fff' } }),
  option: (base: any, state: any) => ({
    ...base, backgroundColor: state.isFocused || state.isSelected ? '#48484a' : '#29292b',
    color: '#f4f2eb', '&:active': { backgroundColor: '#5b5b5d' },
  }),
};

const reviewRatingStyles = {
  itemShapes: ThinRoundedStar,
  itemStrokeWidth: 1.8,
  activeFillColor: '#f4f2eb',
  activeStrokeColor: '#f4f2eb',
  inactiveFillColor: '#29292b',
  inactiveStrokeColor: '#c4c2bc',
};

const FIELD_LABEL_CLASS =
  'add-mender-modal-label mb-1.5 block text-[11px]';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddMenderPage() {
  const navigate = useNavigate();

  // ---- form fields ----
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState('');
  const [phoneMenuStyle, setPhoneMenuStyle] = useState<React.CSSProperties>({});
  const [phoneCountry, setPhoneCountry] = useState<CountryIso2>(getBrowserCountry);
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [social, setSocial] = useState('');
  const [email, setEmail] = useState('');
  const [entryLevel, setEntryLevel] = useState<string | null>(null);
  const [entryLevelSelection, setEntryLevelSelection] = useState<EntryLevelOption | null>(null);
  const [locationVisibility, setLocationVisibility] = useState<'exact' | 'approx'>('exact');
  const [locationVisibilityTouched, setLocationVisibilityTouched] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [regionalTechniques, setRegionalTechniques] = useState<string[]>([]);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // ---- map / location state ----
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [geoResolved, setGeoResolved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const [addressSuggestionsEnabled, setAddressSuggestionsEnabled] = useState(false);
  const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : undefined;

  // ---- refs to survive effect closures ----
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const googleAutocompleteRef = useRef<any>(null);
  const panelRef = useRef<HTMLElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const latestSelectedCoordinatesRef = useRef<[number, number] | null>(null);
  const phoneInputInteractedRef = useRef(false);
  const pendingReverseGeocodeRef = useRef<Promise<string | null> | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const addressManuallyEditedRef = useRef(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      console.log('[Add mender] Current address field value:', address);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [address]);

  // Keep a ref copy of position so GMaps callbacks always read the latest value
  const positionRef = useRef(position);
  positionRef.current = position;

  // ------------------------------------------------------------------
  // Helpers that touch the map directly (not via state)
  // ------------------------------------------------------------------

  const centerInUncoveredMap = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter({ lat, lng });
    if (window.matchMedia('(min-width: 768px)').matches && panelRef.current) {
      // A negative pan moves the selected pin right, into the uncovered map.
      const coveredWidth = panelRef.current.getBoundingClientRect().right;
      map.panBy(-coveredWidth / 2, 0);
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('mymenders-add-active');
    const observer = new ResizeObserver(() => {
      const coordinates = positionRef.current;
      if (coordinates) centerInUncoveredMap(...coordinates);
    });
    if (mapContainerRef.current) observer.observe(mapContainerRef.current);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => {
      observer.disconnect();
      document.body.classList.remove('mymenders-add-active');
    };
  }, [centerInUncoveredMap]);

  const panMapTo = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(19);
    centerInUncoveredMap(lat, lng);
  }, [centerInUncoveredMap]);

  const positionPhoneMenu = useCallback(() => {
    const button = panelRef.current?.querySelector('.mymenders-phone-input__country-button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const height = Math.min(160, window.innerHeight - 112);
    setPhoneMenuStyle({
      position: 'fixed', left: rect.left,
      top: rect.bottom + height + 8 <= window.innerHeight - 16
        ? rect.bottom + 4 : Math.max(80, rect.top - height - 4),
      maxHeight: height,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', positionPhoneMenu);
    window.addEventListener('scroll', positionPhoneMenu, true);
    return () => {
      window.removeEventListener('resize', positionPhoneMenu);
      window.removeEventListener('scroll', positionPhoneMenu, true);
    };
  }, [positionPhoneMenu]);

  const enableAddressSuggestions = useCallback(() => {
    setAddressSuggestionsEnabled(true);
  }, []);

  const disableAddressSuggestions = useCallback(() => {
    setAddressSuggestionsEnabled(false);
    addressInputRef.current?.blur();
  }, []);

  const reverseGeocode = useCallback(
    (lat: number, lng: number): Promise<string | null> => {
      disableAddressSuggestions();

      const requestId = ++reverseGeocodeRequestIdRef.current;
      const coordinates: [number, number] = [lat, lng];

      const lookup = new Promise<string | null>((resolve) => {
        const useGeoapify = () => {
          geoReverse(lat, lng)
            .then(resolve)
            .catch(() => resolve(null));
        };

        // Try Google first.
        if ((window as any).google?.maps) {
          try {
            const geocoder = new (window as any).google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
              if (status === 'OK' && results?.[0]?.formatted_address) {
                resolve(results[0].formatted_address);
              } else {
                // Fall back to Geoapify.
                useGeoapify();
              }
            });
          } catch {
            useGeoapify();
          }
        } else {
          // Google not loaded — use Geoapify directly.
          useGeoapify();
        }
      }).then((resolvedAddress) => {
        const isCurrentRequest =
          requestId === reverseGeocodeRequestIdRef.current &&
          coordinatesMatch(latestSelectedCoordinatesRef.current, coordinates);

        // A late response must not replace the address for a newer pin, or a
        // manual edit made while this lookup was pending.
        if (isCurrentRequest && resolvedAddress && !addressManuallyEditedRef.current) {
          setAddress(resolvedAddress);
        }

        return resolvedAddress;
      });

      return lookup;
    },
    [disableAddressSuggestions],
  );

  // Central "go here" action used by autocomplete, click, and drag
  const goToLocation = useCallback(
    (lat: number, lng: number, addr?: string) => {
      disableAddressSuggestions();
      latestSelectedCoordinatesRef.current = [lat, lng];
      setPosition([lat, lng]);
      if (addr) {
        ++reverseGeocodeRequestIdRef.current;
        pendingReverseGeocodeRef.current = null;
        addressManuallyEditedRef.current = false;
        setAddress(addr);
      } else {
        addressManuallyEditedRef.current = false;
        setAddress('');
        pendingReverseGeocodeRef.current = reverseGeocode(lat, lng);
      }
      panMapTo(lat, lng);
    },
    [disableAddressSuggestions, panMapTo, reverseGeocode],
  );

  // ------------------------------------------------------------------
  // Effect 1 — Geolocation
  // ------------------------------------------------------------------
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coordinates: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          if (!latestSelectedCoordinatesRef.current) {
            latestSelectedCoordinatesRef.current = coordinates;
            setPosition(coordinates);
            pendingReverseGeocodeRef.current = reverseGeocode(...coordinates);
          }
          setGeoResolved(true);
          void getCountryFromCoordinates(pos.coords.latitude, pos.coords.longitude).then((country) => {
            if (!country || phoneInputInteractedRef.current) return;
            setPhone('');
            setPhoneCountry(country);
          });
        },
        () => {
          if (!latestSelectedCoordinatesRef.current) setPosition(DEFAULT_CENTER);
          setGeoResolved(true);
        },
      );
    } else {
      setPosition(DEFAULT_CENTER);
      setGeoResolved(true);
    }
  }, [reverseGeocode]);

  // ------------------------------------------------------------------
  // Effect 1b — centre the map on the user's location once geolocation
  // resolves. The map is usually created (Effect 2) before the
  // geolocation callback lands, so it starts on the default centre —
  // this effect pulls it to the geolocated position afterwards.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!geoResolved || !position) return;
    panMapTo(position[0], position[1]);
  }, [geoResolved, position, panMapTo]);

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

        // ---- Create the map ----
        const initial = positionRef.current || DEFAULT_CENTER;
        const map = new g.maps.Map(mapContainerRef.current, {
          center: { lat: initial[0], lng: initial[1] },
          zoom: 19,
          styles: [
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          ],
          mapTypeControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;
        centerInUncoveredMap(...initial);

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
            goToLocation(lat, lng, addr);
            setMapError(null);
          });
          setPlacesReady(true);
        }

        // ---- Marker (draggable) ----
        const marker = new g.maps.Marker({
          map,
          position: { lat: initial[0], lng: initial[1] },
          icon: createLocationPinIcon(g.maps, getStudioTypeColor(types), '#ffffff', 1.3),
          draggable: true,
        });
        markerRef.current = marker;

        // ---- Map click ----
        map.addListener('click', (evt: any) => {
          if (!evt.latLng) return;
          const lat = evt.latLng.lat();
          const lng = evt.latLng.lng();
          goToLocation(lat, lng);
        });

        // ---- Marker drag ----
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          goToLocation(lat, lng);
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
  // Effect 3 — sync marker position + colour when position/studio type changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!position || !markerRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    const latLng = { lat: position[0], lng: position[1] };
    markerRef.current.setPosition(latLng);
    markerRef.current.setIcon(
      createLocationPinIcon(g.maps, getStudioTypeColor(types), '#ffffff', 1.3),
    );
  }, [position, types]);

  // ------------------------------------------------------------------
  // Form helpers
  // ------------------------------------------------------------------

  const resetReviewFields = () => {
    setReviewStars(0);
    setReviewText('');
  };

  const onEntryLevelChange = (level: string) => {
    if (level === entryLevel) return;
    setEntryLevel(level);
    setLocationVisibility(level === 'Member of the public' ? 'approx' : 'exact');
    setLocationVisibilityTouched(false);
    if (level === 'Menders') resetReviewFields();

  };

  // Back to the role picker — the only place to choose who's adding this.
  const goBackToPicker = () => {
    setEntryLevelSelection(ENTRY_LEVEL_OPTIONS.find((option) => option === entryLevel) ?? null);
    setEntryLevel(null);
    setLocationVisibility('exact');
    setLocationVisibilityTouched(false);
  };

  const onStudioTypeChange = (nextTypes: string[]) => {
    setTypes(nextTypes);
    if (entryLevel === 'Menders' && !locationVisibilityTouched) {
      setLocationVisibility(nextTypes.includes('home') ? 'approx' : 'exact');
    }
  };

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryLevel) return;
    setSubmitError('');
    setSubmitting(true);

    if (!name.trim()) {
      setSubmitError('Shop name is required.');
      setSubmitting(false);
      return;
    }

    if (!position || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
      setSubmitError('Please select a location on the map — click or drag the pin.');
      setSubmitting(false);
      return;
    }

    const selectedPosition = position;
    const selectedCoordinates = latestSelectedCoordinatesRef.current;
    const pendingLookup = pendingReverseGeocodeRef.current;
    let lookedUpAddress: string | null = null;

    if (pendingLookup && coordinatesMatch(selectedCoordinates, selectedPosition)) {
      lookedUpAddress = await pendingLookup;
    }

    const resolvedAddress =
      (addressManuallyEditedRef.current ? address.trim() : lookedUpAddress || address.trim()) ||
      'Location selected on map';
    const normalizedReview = Number.isFinite(reviewStars) ? Math.min(5, Math.max(0, reviewStars)) : 0;
    const phoneDigits = phone.replace(/\D/g, '');
    const dialCodeDigits = phoneDialCode.replace(/\D/g, '');
    const submittedPhone = phoneDigits.length > dialCodeDigits.length ? phone : '';
    const submittedSocial = normalizeSocialProfile(social);

    const payload = {
      name,
      category: entryLevel,
      entry_level: entryLevel,
      types,
      address: resolvedAddress,
      latitude: selectedPosition[0],
      longitude: selectedPosition[1],
      location_visibility: entryLevel === 'Member of the public' ? 'approx' : locationVisibility,
      ...(submittedPhone ? { phone: submittedPhone } : {}),
      website: website || undefined,
      social: submittedSocial || undefined,
      email: email || undefined,
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
        website,
        social: submittedSocial,
        email,
        review_text: reviewText,
      }),
    };

    try {
      const res = await fetch(`${window.location.origin}/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Failed to add mender (${res.status}). Please try again.`);
      }
      setSubmitting(false);
      setSubmissionComplete(true);
      window.setTimeout(() => setShowSuccessModal(true), 450);
    } catch (err) {
      console.error('Failed to add vendor:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to add mender. Please try again.');
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Derived UI flags
  // ------------------------------------------------------------------

  // Show the fallback text input when Places isn't available OR we hit an error
  const showFallbackInput = !placesReady;

  // Role choice is staged in the picker and applied when Continue is pressed.
  const entryLevelCards = (
    <div className="space-y-3">
      {ENTRY_LEVEL_OPTIONS.map((level) => {
        const meta = ENTRY_LEVEL_META[level];
        const isSelected = entryLevelSelection === level;

        return (
          <label key={level} className="group block cursor-pointer">
            <input
              type="radio"
              name="entry-level-picker"
              value={level}
              checked={isSelected}
              onChange={() => setEntryLevelSelection(level)}
              className="peer sr-only"
            />
            <span
              className={`add-mender-role relative flex min-h-[78px] items-center gap-3 rounded-2xl border px-4 py-2 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[#f4f2eb] sm:min-h-[90px] sm:gap-4 sm:px-5 ${
                isSelected
                  ? meta.activePanelClasses
                  : 'add-mender-role--idle'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight text-[var(--mm-black)]">
                  {meta.title}
                </span>
                <span className="mt-1 block text-sm leading-snug text-[var(--mm-muted)]">
                  {meta.description}
                </span>
              </span>

            </span>
          </label>
        );
      })}
    </div>
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="add-mender-page relative z-0 h-[100dvh] w-full">
      <div className="add-mender-layout">
        {/* ==================== FORM SIDEBAR ==================== */}
        <aside ref={panelRef} className="add-mender-panel">
          {entryLevel === null ? (
            <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
              <div className="flex min-h-full flex-col md:justify-center">
              <h2 className="mymenders-card-title-semi mb-5 text-center text-xl text-brand-dark-on">
                Who are you adding?
              </h2>
              <fieldset>
                <legend className="sr-only">Choose who is adding the mender</legend>
                {entryLevelCards}
              </fieldset>
              </div>
            </div>
            <div className="add-mender-actions shrink-0 px-4 py-3">
              <button
                type="button"
                disabled={entryLevelSelection === null}
                onClick={() => entryLevelSelection && onEntryLevelChange(entryLevelSelection)}
                className="mymenders-outline-button w-full"
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            </>
          ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-4 py-4">
                {/* Change the role by heading back to the picker */}
                <button
                  type="button"
                  onClick={goBackToPicker}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--mm-muted)] transition-colors hover:text-[var(--mm-text)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </button>

                <div className="mymenders-fade-in space-y-4">
                {/* Studio Name */}
                <div>
                  <label htmlFor="name" className={FIELD_LABEL_CLASS}>
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

                {/* Studio Type + Tel Number */}
                <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="studio-type" className={FIELD_LABEL_CLASS}>Studio Type</label>
                  <Select
                    inputId="studio-type"
                    options={typeOptions}
                    value={typeOptions.find((o) => types.includes(o.value)) ?? null}
                    onChange={(opt) => onStudioTypeChange(toSingleValue(opt))}
                    placeholder="Select studio type..."
                    isClearable
                    menuPortalTarget={selectMenuPortalTarget}
                    menuPosition="fixed"
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={FIELD_LABEL_CLASS}>Tel Number</label>
                  <div onPointerDown={() => { phoneInputInteractedRef.current = true; }} onFocusCapture={positionPhoneMenu} onClickCapture={positionPhoneMenu}>
                    <PhoneInput
                      key={phoneCountry}
                      defaultCountry={phoneCountry}
                      value={phone}
                      onChange={(nextPhone, metadata) => {
                        setPhone(nextPhone);
                        setPhoneDialCode(metadata.country.dialCode);
                      }}
                      placeholder="Phone"
                      allowMaskOverflow
                      inputProps={{ id: 'phone', name: 'phone', onInput: () => { phoneInputInteractedRef.current = true; } }}
                      className="mymenders-phone-input"
                      inputClassName="mymenders-phone-input__field"
                      countrySelectorStyleProps={{
                        buttonClassName: 'mymenders-phone-input__country-button',
                        dropdownStyleProps: { className: 'mymenders-phone-input__dropdown', style: phoneMenuStyle },
                      }}
                    />
                  </div>
                </div>
                </div>

                <div>
                  <label htmlFor="address" className={FIELD_LABEL_CLASS}>Address</label>
                  {!showFallbackInput ? (
                    <input
                      id="address"
                      ref={addressInputRef}
                      type="text"
                      value={address}
                      onFocus={enableAddressSuggestions}
                      onChange={(e) => {
                        enableAddressSuggestions();
                        addressManuallyEditedRef.current = true;
                        setAddress(e.target.value);
                      }}
                      placeholder="Search an address to place the pin"
                      autoComplete="off"
                      className="mymenders-field w-full border px-3 py-2.5 text-sm text-[var(--mm-black)] outline-none"
                    />
                  ) : (
                    <GeoAutocomplete
                      menuPortalTarget={selectMenuPortalTarget}
                      id="address"
                      value={address}
                      onChange={(val) => {
                        addressManuallyEditedRef.current = true;
                        setAddress(val);
                      }}
                      onSelect={(s) => goToLocation(s.lat, s.lng, s.formatted)}
                      suggestionsEnabled={addressSuggestionsEnabled}
                      onManualInputFocus={enableAddressSuggestions}
                      onManualInputChange={enableAddressSuggestions}
                      onSuggestionsClose={disableAddressSuggestions}
                      placeholder="Search an address to place the pin"
                    />
                  )}
                  {mapError && <p className="mt-1.5 text-xs text-[#ffd0b0]">{mapError}</p>}
                </div>

                {/* Location visibility is configurable only for Home menders. */}
                {types.includes('home') && entryLevel !== 'Member of the public' ? (
                  <div className="add-mender-visibility rounded-2xl border border-dashed p-3" role="group" aria-labelledby="location-visibility-label">
                    <p id="location-visibility-label" className={FIELD_LABEL_CLASS}>Location visibility</p>
                    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Location visibility">
                      {([
                        ['exact', 'Exact', 'Show your submitted address and pin.'],
                        ['approx', 'Approximate', 'Show a nearby point within a 200 m zone.'],
                      ] as const).map(([value, label, description]) => (
                        <label key={value} className="flex h-full cursor-pointer">
                          <input
                            type="radio"
                            name="location-visibility"
                            value={value}
                            checked={locationVisibility === value}
                            onChange={() => {
                              setLocationVisibility(value);
                              setLocationVisibilityTouched(true);
                            }}
                            className="peer sr-only"
                          />
                          <span className="block h-full w-full rounded-xl border border-dashed border-[#e5e7eb] px-3 py-2.5 transition-colors peer-checked:border-[#f4f2eb] peer-checked:bg-[#48484a] peer-focus-visible:ring-2 peer-focus-visible:ring-[#f4f2eb]">
                            <span className="flex items-start gap-2">
                              {value === 'exact' ? (
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mm-text-soft)]" aria-hidden="true" />
                              ) : (
                                <VectorSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mm-text-soft)]" aria-hidden="true" />
                              )}
                              <span className="min-w-0">
                                <span className="block text-xs font-bold text-[var(--mm-text)]">{label}</span>
                                <span className="mt-0.5 block text-[11px] leading-[1.35] text-[var(--mm-muted)]">{description}</span>
                              </span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Email address */}
                <div>
                    <label htmlFor="email" className={FIELD_LABEL_CLASS}>
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
                    />
                </div>

                {/* Website */}
                <div>
                    <label htmlFor="website" className={FIELD_LABEL_CLASS}>
                      Website
                    </label>
                    <input
                      id="website"
                      type="text"
                      value={website}
                      placeholder="www.yourwebsite.com"
                      onChange={(e) => setWebsite(e.target.value)}
                      className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
                    />
                </div>
                {/* Instagram */}
                <div>
                    <label htmlFor="social" className={FIELD_LABEL_CLASS}>
                      Instagram
                    </label>
                    <InputGroup className="mymenders-field h-10 w-full rounded-md border bg-white shadow-none focus-within:border-[var(--mm-focus)] focus-within:ring-2 focus-within:ring-[var(--mm-focus)]/30">
                      <InputGroupAddon align="inline-start" className="h-full px-3 text-sm text-[var(--mm-muted)]">
                        <InputGroupText>instagram.com/</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id="social"
                        type="text"
                        value={social}
                        onChange={(e) => setSocial(e.target.value)}
                        placeholder="yourhandle"
                        aria-label="Instagram handle"
                        className="h-full border-0 px-3 py-2 text-sm shadow-none focus-visible:ring-0"
                      />
                    </InputGroup>
                </div>

                {/* Categories */}
                <div>
                  <label htmlFor="categories" className={FIELD_LABEL_CLASS}>Categories</label>
                  <Select
                    isMulti
                    closeMenuOnSelect={false}
                    blurInputOnSelect={false}
                    inputId="categories"
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
                  <label htmlFor="regional-techniques" className={FIELD_LABEL_CLASS}>
                    Regional techniques
                  </label>
                  <Select
                    isMulti
                    closeMenuOnSelect={false}
                    blurInputOnSelect={false}
                    inputId="regional-techniques"
                    options={techniqueOptions}
                    value={techniqueOptions.filter((o) => regionalTechniques.includes(o.value))}
                    onChange={(opts) => setRegionalTechniques(toValues(opts))}
                    placeholder="Select techniques..."
                    menuPortalTarget={selectMenuPortalTarget}
                    menuPosition="fixed"
                    styles={selectStyles}
                  />
                </div>

                {/* Review (Member of the public only) */}
                {entryLevel === 'Member of the public' && (
                  <div>
                    <span
                      id="review-stars-label"
                      className={FIELD_LABEL_CLASS}
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
                        className="mymenders-field mt-2 w-full border px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                )}
                </div>
              </div>
            <div className="add-mender-actions shrink-0 px-4 py-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={submitting || submissionComplete}
                  className="mymenders-outline-button mymenders-outline-button--compact add-mender-cancel flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || submissionComplete}
                  className="mymenders-outline-button mymenders-outline-button--compact min-w-0 flex-1"
                >
                  {submissionComplete ? (
                    <>
                      <Check className="h-4 w-4 animate-[mm-submit-confirm_350ms_ease-out]" strokeWidth={2.5} aria-hidden="true" />
                      Submitted
                    </>
                  ) : submitting ? 'Submitting…' : 'Submit for review'}
                </button>
              </div>
              {submitError && <p className="mt-3 text-xs text-[#ffd0b0]">{submitError}</p>}
            </div>
            </div>
          </form>
          )}
        </aside>

        {/* ==================== MAP ==================== */}
        <div className="add-mender-map">
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[var(--mm-black)]/30 p-5 backdrop-blur-[2px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contribution-success-title"
            className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-7 shadow-[var(--mm-shadow-panel)] sm:p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f1e7] text-[#527b56]">
              <Check className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <h2 id="contribution-success-title" className="mymenders-card-title-semi mt-5 text-3xl text-[var(--mm-text)]">
              Thanks for your contribution.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mm-muted)]">
              Your mender has been submitted for review and will soon be live on the map.
            </p>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="mymenders-outline-button mt-7 w-full"
            >
              Go back to Map
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
