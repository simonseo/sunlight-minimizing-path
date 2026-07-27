import { useEffect, useRef, useState } from 'react';
import type { Place } from '../data/types';

interface Suggestion {
  mapbox_id: string;
  name: string;
  full_address?: string;
  place_formatted?: string;
}

interface SearchResponse {
  suggestions?: Suggestion[];
}

interface RetrieveResponse {
  features?: Array<{ properties?: { name?: string; full_address?: string; place_formatted?: string }; geometry?: { coordinates?: [number, number] } }>;
}

interface LocationSearchProps {
  label: string;
  value: Place;
  onSelect: (place: Place) => void;
}

function sessionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `study-${Date.now()}`;
}

export function LocationSearch({ label, value, onSelect }: LocationSearchProps) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const sessionToken = useRef(sessionId());
  const [query, setQuery] = useState(value.label);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery(value.label);
  }, [value.label]);

  useEffect(() => {
    if (!token || query.trim().length < 3 || query === value.label) {
      setSuggestions([]);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          access_token: token,
          session_token: sessionToken.current,
          limit: '4',
          proximity: '-118.4912,34.0195',
        });
        const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params}`);
        const data = (await response.json()) as SearchResponse;
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query, token, value.label]);

  async function selectSuggestion(suggestion: Suggestion) {
    if (!token) return;
    try {
      const params = new URLSearchParams({ access_token: token, session_token: sessionToken.current });
      const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?${params}`);
      const data = (await response.json()) as RetrieveResponse;
      const feature = data.features?.[0];
      const coordinate = feature?.geometry?.coordinates;
      if (!coordinate) return;
      onSelect({
        label: feature.properties?.full_address ?? feature.properties?.place_formatted ?? suggestion.name,
        coordinate,
      });
      setSuggestions([]);
      sessionToken.current = sessionId();
    } catch {
      setSuggestions([]);
    }
  }

  return (
    <label className="location-search">
      <span>{label}</span>
      <div className="search-input-wrap">
        <input
          aria-label={label}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Santa Monica"
          autoComplete="off"
        />
        {isLoading ? <span className="search-status" aria-label="Searching">···</span> : null}
      </div>
      {suggestions.length > 0 ? (
        <div className="suggestion-list" role="listbox">
          {suggestions.map((suggestion) => (
            <button type="button" key={suggestion.mapbox_id} onClick={() => void selectSuggestion(suggestion)}>
              <strong>{suggestion.name}</strong>
              <small>{suggestion.full_address ?? suggestion.place_formatted}</small>
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}
