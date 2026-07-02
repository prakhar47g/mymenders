import React, { useEffect, useRef, useState } from 'react';
import { autocomplete, type GeoapifySuggestion } from '../utils/geoapify';

interface GeoAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect: (suggestion: GeoapifySuggestion) => void;
  placeholder?: string;
}

export function GeoAutocomplete({ value, onChange, onSelect, placeholder = 'Street address' }: GeoAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch suggestions when value changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await autocomplete(value);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pickSuggestion = (s: GeoapifySuggestion) => {
    onChange(s.formatted);
    onSelect(s);
    setOpen(false);
    setActiveIndex(-1);
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
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
        className="mymenders-field w-full border rounded-lg p-2.5 text-sm text-slate-900 outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[2100] max-h-48 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 ${
                i === activeIndex ? 'bg-gray-100 text-slate-900' : 'text-slate-700 hover:bg-gray-50'
              }`}
              onMouseDown={() => pickSuggestion(s)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="font-medium">{s.formatted}</span>
              {s.city && (
                <span className="text-xs text-slate-400 ml-2">
                  {[s.city, s.country].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
