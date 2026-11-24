import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { autocomplete, type GeoapifySuggestion } from '../utils/geoapify';
import { GeocodingCredit } from './GeocodingCredit';

interface GeoAutocompleteProps {
  id: string;
  label: string;
  menuPortalTarget?: HTMLElement;
  value: string;
  onChange: (address: string) => void;
  onSelect: (suggestion: GeoapifySuggestion) => void;
  suggestionsEnabled?: boolean;
  onManualInputFocus?: () => void;
  onManualInputChange?: () => void;
  onSuggestionsClose: () => void;
  placeholder?: string;
}

export function GeoAutocomplete({
  id, label, menuPortalTarget, value, onChange, onSelect, suggestionsEnabled = true,
  onManualInputFocus, onManualInputChange, onSuggestionsClose, placeholder,
}: GeoAutocompleteProps) {
  const [response, setResponse] = useState<{ query: string; results: GeoapifySuggestion[] } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const searching = suggestionsEnabled && value.trim().length >= 3;
  const results = searching && response?.query === value ? response.results : null;
  const open = Boolean(results?.length);

  useEffect(() => {
    if (!searching) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const nextResults = await autocomplete(value);
      if (!cancelled) setResponse({ query: value, results: nextResults });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searching, value]);

  const close = () => {
    setActiveIndex(-1);
    onSuggestionsClose();
  };

  useEffect(() => {
    if (!searching) return;
    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setActiveIndex(-1);
      onSuggestionsClose();
    };

    document.addEventListener('pointerdown', onOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', onOutsidePointerDown);
  }, [onSuggestionsClose, searching]);

  const pickSuggestion = (result: GeoapifySuggestion) => {
    onChange(result.formatted);
    onSelect(result);
    close();
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (results?.[activeIndex]) pickSuggestion(results[activeIndex]);
    } else if (event.key === 'Escape') {
      close();
    } else if (results?.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setActiveIndex((previous) => {
        if (event.key === 'ArrowDown') return (previous + 1) % results.length;
        return previous <= 0 ? results.length - 1 : previous - 1;
      });
    }
  };

  useEffect(() => {
    if (activeIndex >= 0) {
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, listId]);

  useLayoutEffect(() => {
    if (!open || !menuPortalTarget) return;
    const placeMenu = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 88;
      const useBelow = below >= Math.min(192, above);
      setMenuStyle({
        position: 'fixed', left: rect.left, width: rect.width,
        maxHeight: Math.min(192, Math.max(48, below, above)),
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

  const sources = new Map(results?.flatMap(({ credit }) =>
    credit.sources.map((source) => [source.label, source] as const),
  ));
  const menu = open && results ? (
    <div
      ref={menuRef}
      style={menuPortalTarget ? menuStyle : undefined}
      className="add-mender-suggestions flex max-h-48 flex-col overflow-hidden rounded-xl border shadow-lg"
    >
      <ul id={listId} role="listbox" aria-label={label} className="min-h-0 overflow-y-auto">
        {results.map((result, index) => (
          <li
            key={`${result.lat}-${result.lng}-${index}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className="cursor-pointer border-b px-3 py-2 text-sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pickSuggestion(result)}
          >
            {result.formatted}
          </li>
        ))}
      </ul>
      {sources.size > 0 && (
        <div className="border-t border-[#5b5b5d] px-3 py-1">
          <GeocodingCredit sources={[...sources.values()]} />
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative w-full">
      <label htmlFor={id} className="add-mender-modal-label mb-1.5 block text-[11px]">{label}</label>
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        value={value}
        onChange={(event) => {
          setResponse(null);
          setActiveIndex(-1);
          onManualInputChange?.();
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={onManualInputFocus}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="mymenders-field w-full border px-3 py-2 text-sm outline-none"
      />
      <div role="status" className="mt-1 text-xs text-[var(--mm-muted)]">
        {results?.length === 0 && 'No addresses found. Try another search or tap the map.'}
        {searching && !results && 'Searching…'}
      </div>
      {menuPortalTarget ? createPortal(menu, menuPortalTarget) : menu}
    </div>
  );
}
