import { useEffect, useId, useMemo, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { api } from "../lib/api";
import type { StationCandidate } from "../lib/types";

type Props = {
  currentLocation?: { lat: number; lng: number };
  helper?: string;
  inputValue: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: StationCandidate | null;
  onInputChange: (value: string) => void;
  onSelect: (station: StationCandidate) => void;
};

const stationTypeLabel = (station: StationCandidate) => {
  if (station.primaryType === "subway_station") return "地下鉄駅";
  if (station.primaryType === "light_rail_station") return "路面電車駅";
  if (station.primaryType === "transit_station") return "交通結節点";
  return "鉄道駅";
};

export function StationSearchField({
  currentLocation,
  helper,
  inputValue,
  label,
  placeholder = "駅名を検索",
  required = false,
  value,
  onInputChange,
  onSelect
}: Props) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StationCandidate[]>([]);
  const keyword = inputValue.trim();
  const showResults = focused && (results.length > 0 || loading || Boolean(error) || (searched && keyword.length >= 2));
  const selectionSummary = useMemo(() => {
    if (!value) return null;
    return `${value.name} / ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`;
  }, [value]);

  useEffect(() => {
    if (keyword.length < 2) {
      setResults([]);
      setError(null);
      setSearched(false);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .stations(
          {
            keyword,
            lat: currentLocation?.lat,
            lng: currentLocation?.lng,
            limit: 8
          },
          controller.signal
        )
        .then((payload) => {
          setResults(payload.items);
          setSearched(true);
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") {
            return;
          }
          setResults([]);
          setSearched(true);
          setError("駅候補を取得できませんでした。Google Places の設定を確認してください。");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [currentLocation?.lat, currentLocation?.lng, keyword]);

  return (
    <div className="field station-search-field">
      <span>{label}</span>
      <div className="station-search-box">
        <Search aria-hidden="true" size={17} />
        <input
          aria-label={label}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showResults}
          className="station-search-input"
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 140);
          }}
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          required={required}
          role="combobox"
          value={inputValue}
        />
        {loading ? <Loader2 aria-hidden="true" className="spin station-search-spinner" size={17} /> : null}
      </div>
      {showResults ? (
        <div className="station-results" id={listId} role="listbox">
          {results.map((station) => (
            <button
              className="station-option"
              key={`${station.id}-${station.name}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(station);
                setFocused(false);
              }}
              role="option"
              type="button"
            >
              <MapPin aria-hidden="true" size={17} />
              <span>
                <strong>{station.name}</strong>
                <small>
                  {stationTypeLabel(station)}
                  {station.address ? ` / ${station.address}` : ""}
                </small>
              </span>
            </button>
          ))}
          {!loading && !error && searched && results.length === 0 ? (
            <div className="station-search-status">
              候補が見つかりません。駅名を具体的にするか、Google Places のサーバーキーを確認してください。
            </div>
          ) : null}
          {error ? <div className="station-search-status">{error}</div> : null}
        </div>
      ) : null}
      {selectionSummary ? <small className="field-helper">{selectionSummary}</small> : helper ? <small className="field-helper">{helper}</small> : null}
    </div>
  );
}
