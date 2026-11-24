import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, Position, FrameSelect as VectorSquare } from 'iconoir-react';
import Select, { type GroupBase, type MultiValue, type SingleValue } from 'react-select';
import { PhoneInput, type CountryIso2 } from 'react-international-phone';
import { Rating as ReactRating, ThinRoundedStar } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';
import type { GeocodingAttribution } from '../types';
import { normalizeGeocodingCredit } from '../../shared/geocodingCredit.js';
import { createLocationPinIcon, loadGoogleMapsScript } from '../utils/googleMaps';
import { reverseGeocodeDetails, type GeoapifySuggestion } from '../utils/geoapify';
import { GeocodingCredit } from '../components/GeocodingCredit';
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
    description: 'List your practice on the map and help people find you easily',
    activePanelClasses: 'add-mender-role--selected',
  },
  'Member of the public': {
    title: 'I know a mender',
    description: 'Recommend someone you trust to mend the things that matter',
    activePanelClasses: 'add-mender-role--selected',
  },
};

const DEFAULT_CENTER: [number, number] = [51.505, -0.09]; // London
const DEFAULT_PHONE_COUNTRY: CountryIso2 = 'gb';
const LOCATION_ERRORS: Record<number, string> = {
  1: 'Location access is blocked. Check this site’s location permission and your device’s location settings.',
  2: 'Your device couldn’t determine its location. Check that location services are on, then try again.',
  3: 'Finding your location timed out. Try Locate Me again.',
};

const getBrowserCountry = (): CountryIso2 => {
  if (typeof navigator === 'undefined') return DEFAULT_PHONE_COUNTRY;
  const region = navigator.language?.split('-')[1]?.trim();
  return region && /^[a-z]{2}$/i.test(region) ? (region.toLowerCase() as CountryIso2) : DEFAULT_PHONE_COUNTRY;
};

const STEPS = ['Pin location', 'Basic details', 'Social', 'Practice'] as const;
type Coordinates = [latitude: number, longitude: number];

const coordinatesMatch = (first: Coordinates, second: Coordinates | null) =>
  first[0] === second?.[0] && first[1] === second[1];

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
  const [editedAddress, setEditedAddress] = useState<string | null>(null);
  const [addressNeedsReview, setAddressNeedsReview] = useState(false);
  const [editedAddressCredit, setEditedAddressCredit] = useState<GeocodingAttribution>();
  const [website, setWebsite] = useState('');
  const [social, setSocial] = useState('');
  const [email, setEmail] = useState('');
  const [entryLevel, setEntryLevel] = useState<EntryLevelOption | null>(null);
  const [entryLevelSelection, setEntryLevelSelection] = useState<EntryLevelOption | null>(null);
  const [homeVisibility, setHomeVisibility] = useState<'exact' | 'approx'>('approx');
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [regionalTechniques, setRegionalTechniques] = useState<string[]>([]);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [confirmedPosition, setConfirmedPosition] = useState<Coordinates | null>(null);
  const [suggestion, setSuggestion] = useState<GeoapifySuggestion | null>(null);
  const [lookingUpAddress, setLookingUpAddress] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [mapError, setMapError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : undefined;
  const pinStep = entryLevel !== null && step === 0;
  const showMapOnMobile = entryLevel === null || pinStep;
  const address = editedAddress ?? suggestion?.formatted ?? '';
  const geocodingCredit = suggestion && editedAddressCredit
    ? normalizeGeocodingCredit({
        provider: 'geoapify',
        sources: [...editedAddressCredit.sources, ...suggestion.credit.sources],
      })
    : suggestion?.credit ?? editedAddressCredit;

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const panelRef = useRef<HTMLElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const positionRef = useRef<Coordinates | null>(null);
  const pinStepRef = useRef(pinStep);
  const typesRef = useRef(types);
  const phoneInputInteractedRef = useRef(false);
  const selectionId = useRef(0);
  const gpsRequestId = useRef(0);
  const addressLookupRef = useRef<AbortController | null>(null);
  const submitInFlight = useRef(false);

  pinStepRef.current = pinStep;
  typesRef.current = types;

  const centerInUncoveredMap = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter({ lat, lng });
    if (window.matchMedia('(min-width: 768px)').matches && panelRef.current) {
      map.panBy(-panelRef.current.getBoundingClientRect().right / 2, 0);
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('mymenders-add-active');
    const observer = new ResizeObserver(() => {
      if (mapContainerRef.current?.clientWidth) {
        centerInUncoveredMap(...(positionRef.current ?? DEFAULT_CENTER));
      }
    });
    if (mapContainerRef.current) observer.observe(mapContainerRef.current);
    return () => {
      observer.disconnect();
      document.body.classList.remove('mymenders-add-active');
      ++selectionId.current;
      ++gpsRequestId.current;
      addressLookupRef.current?.abort();
    };
  }, [centerInUncoveredMap]);

  useEffect(() => {
    if (entryLevel) stepHeadingRef.current?.focus();
  }, [entryLevel, step]);

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

  const cancelLocationRequest = useCallback(() => {
    ++gpsRequestId.current;
    setLocating(false);
    setLocationError('');
  }, []);

  const selectLocation = useCallback((
    lat: number,
    lng: number,
    selectedSuggestion?: GeoapifySuggestion,
  ) => {
    if (!pinStepRef.current) return;
    cancelLocationRequest();
    setSearchEnabled(false);
    setSearchText(selectedSuggestion?.formatted ?? '');

    const coordinates: Coordinates = [lat, lng];
    positionRef.current = coordinates;
    setPosition(coordinates);

    if (mapRef.current) {
      mapRef.current.setZoom(19);
      centerInUncoveredMap(lat, lng);
    }

    const id = ++selectionId.current;
    addressLookupRef.current?.abort();
    setSuggestion(selectedSuggestion ?? null);
    setLookingUpAddress(!selectedSuggestion);

    const applySuggestion = (result: GeoapifySuggestion | null) => {
      if (id !== selectionId.current) return;
      setSuggestion(result);
      setLookingUpAddress(false);
      const country = result?.countryCode?.toLowerCase();
      if (country && /^[a-z]{2}$/.test(country) && !phoneInputInteractedRef.current) {
        setPhone('');
        setPhoneCountry(country as CountryIso2);
      }
    };

    if (selectedSuggestion) {
      applySuggestion(selectedSuggestion);
    } else {
      const controller = new AbortController();
      addressLookupRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      void reverseGeocodeDetails(lat, lng, controller.signal)
        .then(applySuggestion)
        .finally(() => window.clearTimeout(timeout));
    }
  }, [cancelLocationRequest, centerInUncoveredMap]);

  const locateMe = () => {
    cancelLocationRequest();
    if (!window.isSecureContext) {
      setLocationError('Locate Me requires a secure connection. Open the HTTPS site, search for an address, or tap the map.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('This browser doesn’t provide location access. Search for an address or tap the map.');
      return;
    }

    const id = gpsRequestId.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (id === gpsRequestId.current) selectLocation(coords.latitude, coords.longitude);
      },
      ({ code }) => {
        if (id !== gpsRequestId.current) return;
        setLocating(false);
        const reason = LOCATION_ERRORS[code] ?? 'Your location couldn’t be determined.';
        setLocationError(`${reason} You can also search for an address or tap the map.`);
      },
      { timeout: 15000 },
    );
  };

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const onAuthFailure = () => setMapError('The map is unavailable. You can still search for an address.');
    const googleWindow = window as any;
    googleWindow.gm_authFailure = onAuthFailure;
    let cancelled = false;
    const listeners: { remove: () => void }[] = [];

    loadGoogleMapsScript(apiKey || '')
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;
        const maps = googleWindow.google?.maps;
        if (!maps) {
          onAuthFailure();
          return;
        }

        const [lat, lng] = positionRef.current ?? DEFAULT_CENTER;
        const map = new maps.Map(mapContainerRef.current, {
          center: { lat, lng },
          zoom: positionRef.current ? 19 : 12,
          styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: pinStepRef.current ? 'cooperative' : 'none',
          zoomControl: pinStepRef.current,
          keyboardShortcuts: pinStepRef.current,
          disableDoubleClickZoom: !pinStepRef.current,
          draggableCursor: 'crosshair',
        });
        mapRef.current = map;
        centerInUncoveredMap(lat, lng);

        const marker = new maps.Marker({
          map,
          position: { lat, lng },
          visible: positionRef.current !== null,
          icon: createLocationPinIcon(maps, getStudioTypeColor(typesRef.current), '#ffffff', 1.3),
          draggable: pinStepRef.current,
          title: 'Mender location',
        });
        markerRef.current = marker;
        listeners.push(
          map.addListener('click', (event: any) => {
            if (event.latLng) selectLocation(event.latLng.lat(), event.latLng.lng());
          }),
          marker.addListener('dragend', () => {
            const location = marker.getPosition();
            if (location) selectLocation(location.lat(), location.lng());
          }),
        );
      })
      .catch(() => {
        if (!cancelled) onAuthFailure();
      });

    return () => {
      cancelled = true;
      if (googleWindow.gm_authFailure === onAuthFailure) delete googleWindow.gm_authFailure;
      listeners.forEach((listener) => listener.remove());
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [centerInUncoveredMap, selectLocation]);

  useEffect(() => {
    mapRef.current?.setOptions({
      gestureHandling: pinStep ? 'cooperative' : 'none',
      zoomControl: pinStep,
      keyboardShortcuts: pinStep,
      disableDoubleClickZoom: !pinStep,
    });
    markerRef.current?.setDraggable(pinStep);
  }, [pinStep]);

  useEffect(() => {
    const marker = markerRef.current;
    const maps = (window as any).google?.maps;
    if (!position || !marker || !maps) return;
    marker.setPosition({ lat: position[0], lng: position[1] });
    marker.setVisible(true);
    marker.setIcon(createLocationPinIcon(maps, getStudioTypeColor(types), '#ffffff', 1.3));
  }, [position, types]);

  const goBack = () => {
    setSubmitError('');
    if (step === 0) {
      cancelLocationRequest();
      setSearchEnabled(false);
      setEntryLevel(null);
    } else {
      setStep(step - 1);
    }
  };

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!entryLevel || submitInFlight.current || submissionComplete) return;
    setSubmitError('');

    if (step === 0) {
      if (!position) return;
      cancelLocationRequest();
      setSearchEnabled(false);
      if (confirmedPosition && !coordinatesMatch(position, confirmedPosition)) {
        setAddressNeedsReview(true);
      }
      setConfirmedPosition(position);
    } else if (step === 1) {
      if (!name.trim()) {
        setSubmitError('Mender / Studio Name is required.');
        e.currentTarget.querySelector<HTMLInputElement>('#name')?.focus();
        return;
      }
      if (lookingUpAddress && editedAddress === null) return;
      setAddressNeedsReview(false);
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!confirmedPosition) return;

    submitInFlight.current = true;
    setSubmitting(true);
    const isContributor = entryLevel === 'Member of the public';
    const locationVisibility = types.includes('home') ? homeVisibility : 'exact';
    const submittedReview = isContributor ? reviewText : '';
    const normalizedReview = Number.isFinite(reviewStars) ? Math.min(5, Math.max(0, reviewStars)) : 0;
    const phoneDigits = phone.replace(/\D/g, '');
    const dialCodeDigits = phoneDialCode.replace(/\D/g, '');
    const submittedPhone = phoneDigits.length > dialCodeDigits.length ? phone : '';
    const submittedSocial = normalizeSocialProfile(social);

    const payload = {
      name: name.trim(),
      category: entryLevel,
      entry_level: entryLevel,
      types,
      address: address.trim(),
      latitude: confirmedPosition[0],
      longitude: confirmedPosition[1],
      location_visibility: isContributor ? 'approx' : locationVisibility,
      ...(submittedPhone ? { phone: submittedPhone } : {}),
      website: website || undefined,
      social: submittedSocial || undefined,
      email: email || undefined,
      categories,
      regional_techniques: regionalTechniques,
      review_text: submittedReview,
      rating: isContributor ? normalizedReview : 0,
      rating_count: isContributor && (submittedReview || normalizedReview > 0) ? 1 : 0,
      photos: JSON.stringify({
        entry_level: entryLevel,
        types,
        categories,
        regional_techniques: regionalTechniques,
        website,
        social: submittedSocial,
        email,
        review_text: submittedReview,
        geocoding_credit: geocodingCredit,
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
      setSubmissionComplete(true);
    } catch (err) {
      console.error('Failed to add vendor:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to add mender. Please try again.');
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Derived UI flags
  // ------------------------------------------------------------------

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
      <div className="add-mender-layout" data-mobile-map={showMapOnMobile}>
        {/* ==================== FORM SIDEBAR ==================== */}
        <aside ref={panelRef} className="add-mender-surface add-mender-panel">
          {entryLevel === null ? (
            <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
              <div className="relative flex min-h-full flex-col md:justify-center">
              <h2 className="mymenders-card-title-semi mb-5 text-center text-xl text-brand-dark-on md:absolute md:inset-x-0 md:top-0">
                Put a mender on the map
              </h2>
              <div aria-hidden="true" className="mymenders-card-title-semi mb-5 hidden text-center text-xl md:block md:invisible">Put a mender on the map</div>
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
                onClick={() => setEntryLevel(entryLevelSelection)}
                className="mymenders-outline-button w-full"
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            </>
          ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <header className="add-mender-step-header px-4 pb-3 pt-4">
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mymenders-card-title-semi text-xl outline-none">
                {STEPS[step]}
              </h2>
              <div className="add-mender-progress mt-3" aria-hidden="true">
                {STEPS.map((label, index) => <span key={label} data-reached={index <= step} />)}
              </div>
            </header>
            <div
              key={step}
              className={`min-h-0 flex-1 overflow-y-auto px-4 ${pinStep ? 'flex flex-col' : 'space-y-4 pb-4'}`}
            >
              {step === 0 && (
                <div className="my-auto shrink-0 space-y-3 py-6">
                  <div className="grid gap-3">
                    <button type="button" onClick={locateMe} disabled={locating} className="mymenders-outline-button add-mender-cancel w-full px-3">
                      <Position className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {locating ? 'Locating…' : 'Locate Me'}
                    </button>
                    <p className="text-center text-xs font-semibold text-[var(--mm-muted)]">OR</p>
                    <button
                      type="button"
                      aria-expanded={searchOpen}
                      onClick={() => {
                        cancelLocationRequest();
                        setSearchOpen(!searchOpen);
                        setSearchEnabled(!searchOpen);
                      }}
                      className="mymenders-outline-button add-mender-cancel w-full px-3"
                    >
                      Enter Address Manually
                    </button>
                  </div>
                  {searchOpen && (
                    <GeoAutocomplete
                      id="pin-address-search"
                      label="Search for an address"
                      menuPortalTarget={selectMenuPortalTarget}
                      value={searchText}
                      onChange={setSearchText}
                      onSelect={(result) => selectLocation(result.lat, result.lng, result)}
                      suggestionsEnabled={searchEnabled}
                      onManualInputFocus={() => setSearchEnabled(true)}
                      onManualInputChange={() => {
                        cancelLocationRequest();
                        setSearchEnabled(true);
                      }}
                      onSuggestionsClose={() => setSearchEnabled(false)}
                      placeholder="Street address or postcode"
                    />
                  )}
                  {(locationError || mapError) && <p role="status" className="text-xs text-[#ffd0b0]">{locationError || mapError}</p>}
                  {(searchOpen || suggestion) && <GeocodingCredit sources={suggestion?.credit.sources} />}
                </div>
              )}
              {step === 1 && (
                <>
                  <div>
                    <label htmlFor="name" className={FIELD_LABEL_CLASS}>
                      Mender / Studio Name
                    </label>
                    <input
                      id="name"
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maria's Shoe Repair"
                      className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="studio-type" className={FIELD_LABEL_CLASS}>Studio Type</label>
                    <Select
                      inputId="studio-type"
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
                    <label htmlFor="address" className={FIELD_LABEL_CLASS}>Address</label>
                    <input
                      id="address"
                      type="text"
                      value={address}
                      autoComplete="street-address"
                      aria-describedby="address-status"
                      onChange={(e) => {
                        if (editedAddress === null) setEditedAddressCredit(suggestion?.credit);
                        setEditedAddress(e.target.value);
                      }}
                      placeholder="Street address, unit or entrance"
                      className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
                    />
                    <div id="address-status" role="status" className="mt-1 space-y-1 text-xs text-[var(--mm-muted)]">
                      {addressNeedsReview && (
                        <p className="text-[#ffd0b0]">The pin moved. Check that your address matches the new location.</p>
                      )}
                      {lookingUpAddress && <p>Looking up the pin’s address…</p>}
                      {!lookingUpAddress && !suggestion && <p>Enter the address a visitor should use.</p>}
                      {suggestion && addressNeedsReview && editedAddress !== null && (
                        <p>Suggested address: {suggestion.formatted}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="phone" className={FIELD_LABEL_CLASS}>Tel Number</label>
                    <div
                      onFocusCapture={() => {
                        phoneInputInteractedRef.current = true;
                        positionPhoneMenu();
                      }}
                      onClickCapture={positionPhoneMenu}
                    >
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
                              checked={homeVisibility === value}
                              onChange={() => setHomeVisibility(value)}
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

                </>
              )}
              {step === 2 && (
                <>
                    <p className="text-sm text-[var(--mm-muted)]">Both fields are optional.</p>
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
                </>
              )}
              {step === 3 && (
                <>
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
                </>
              )}
            </div>
            <div className="add-mender-actions shrink-0 px-4 py-3">
              {submitError && <p role="alert" className="mb-2 text-xs text-[#ffd0b0]">{submitError}</p>}
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={submitting || submissionComplete}
                  className="mymenders-outline-button mymenders-outline-button--compact add-mender-cancel"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || submissionComplete || (step === 0 && !position) ||
                    (step === 1 && lookingUpAddress && editedAddress === null)}
                  className="mymenders-outline-button mymenders-outline-button--compact min-w-0"
                >
                  {submissionComplete ? 'Submitted' : submitting ? 'Submitting…' :
                    step === 3 ? 'Submit for review' : 'Continue'}
                </button>
              </div>
            </div>
          </form>
          )}
        </aside>

        <div className="add-mender-map" inert={!pinStep} aria-hidden={!pinStep}>
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
      </div>

      {submissionComplete && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[var(--mm-black)]/30 p-5 backdrop-blur-[2px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contribution-success-title"
            className="add-mender-surface max-h-full w-full max-w-sm overflow-y-auto p-7 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mm-panel-muted)]">
                <Check className="h-5 w-5 text-green-400" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <h2 id="contribution-success-title" className="mymenders-card-title-semi text-xl text-[var(--mm-text)]">
                Thanks for your contribution.
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mm-muted)]">
              Your mender has been submitted for review and will soon be live on the map.
            </p>
            <button
              type="button"
              onClick={() => navigate('/map')}
              autoFocus
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
