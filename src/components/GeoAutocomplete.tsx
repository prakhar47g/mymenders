import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { autocomplete, type GeoapifySuggestion } from '../utils/geoapify';

interface GeoAutocompleteProps {
  id?: string;
  menuPortalTarget?: HTMLElement;
  value: string;
  onChange: (address: string) => void;
  onSelect: (suggestion: GeoapifySuggestion) => void;
  suggestionsEnabled?: boolean;
  onManualInputFocus?: () => void;
  onManualInputChange?: () => void;
  onSuggestionsClose?: () => void;
  placeholder?: string;
}

export function GeoAutocomplete({
  id,
  menuPortalTarget,
  value,
  onChange,
  onSelect,
  suggestionsEnabled = true,
  onManualInputFocus,
  onManualInputChange,
  onSuggestionsClose,
  placeholder = 'Street address',
}: GeoAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRequestIdRef = useRef(0);

  // Fetch suggestions when value changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++autocompleteRequestIdRef.current;

    if (!suggestionsEnabled || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await autocomplete(value);
      if (requestId !== autocompleteRequestIdRef.current) return;
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (requestId === autocompleteRequestIdRef.current) {
        autocompleteRequestIdRef.current += 1;
      }
    };
  }, [suggestionsEnabled, value]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        onSuggestionsClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onSuggestionsClose, open]);

  const pickSuggestion = (s: GeoapifySuggestion) => {
    autocompleteRequestIdRef.current += 1;
    onChange(s.formatted);
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onManualInputChange?.();
    onChange(e.target.value);
  };

  const handleFocus = () => {
    onManualInputFocus?.();
    if (suggestionsEnabled && suggestions.length > 0) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          pickSuggestion(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        onSuggestionsClose?.();
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // /add can place suggestions outside its independently scrolling panel.
  useLayoutEffect(() => {
    if (!open || !menuPortalTarget) return;
    const placeMenu = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 88;
      const height = Math.min(192, Math.max(48, below, above));
      const useBelow = below >= Math.min(192, above);
      setMenuStyle({
        position: 'fixed', left: rect.left, width: rect.width, maxHeight: height,
        top: useBelow ? rect.bottom + 4 : undefined,
        bottom: useBelow ? undefined : window.innerHeight - rect.top + 4,
        zIndex: 3300,
      });
    };
    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [open, menuPortalTarget]);

  const suggestionList = open && suggestions.length > 0 ? (
        <ul
          ref={listRef}
          style={menuPortalTarget ? menuStyle : undefined}
          className={`${menuPortalTarget ? "add-mender-suggestions" : "absolute left-0 right-0 top-full mt-2"} z-[2100] max-h-48 overflow-y-auto rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]`}
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              className={`cursor-pointer border-b border-[#e5e7eb] px-3 py-2 text-sm last:border-b-0 ${
                i === activeIndex ? 'bg-[#f3f4f6] text-[var(--mm-black)]' : 'text-[#4f4a43] hover:bg-[#f3f4f6]'
              }`}
              onMouseDown={() => pickSuggestion(s)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="">{s.formatted}</span>
              {s.city && (
                <span className="ml-2 text-xs text-[#8a877d]">
                  {[s.city, s.country].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
  ) : null;

  return (
    <div className="relative w-full">
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        className="mymenders-field w-full border px-3 py-2 text-sm text-[var(--mm-black)] outline-none"
      />
      {menuPortalTarget ? createPortal(suggestionList, menuPortalTarget) : suggestionList}
    </div>
  );
}
