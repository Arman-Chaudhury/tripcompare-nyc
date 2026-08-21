import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, LocateFixed, Clock } from 'lucide-react';
import { airportPlaces, presetPlaces, geocode, readRecents, pushRecent, reverseGeocode } from '../lib/geo.js';

const CUSTOM = '__custom__';

export default function PlacePicker({ id, label, place, setPlace, t }) {
  const [custom, setCustom] = useState(place.kind === 'custom');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const abortRef = useRef(null);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const recents = readRecents();

  useEffect(() => {
    if (!custom || query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setBusy(true); setErr(null);
      try {
        setResults(await geocode(query, ctl.signal));
        setActive(-1);
      } catch (e) {
        if (e.name !== 'AbortError') setErr(e);
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, custom]);

  const choose = (p) => { pushRecent(p); setPlace(p); setQuery(''); setResults([]); };
  const onKey = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active >= 0 ? active : 0]); }
    else if (e.key === 'Escape') setResults([]);
  };
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const name = await reverseGeocode(pt);
      setLocating(false);
      choose({ kind: 'custom', id: `me-${pt.lat.toFixed(4)},${pt.lng.toFixed(4)}`, name, full: name, ...pt });
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000 });
  };
  const selectValue = place.kind === 'custom' ? CUSTOM : `${place.kind}:${place.id}`;
  const onSelect = (v) => {
    if (v === CUSTOM) { setCustom(true); return; }
    const [kind, pid] = v.split(':');
    setCustom(false);
    setPlace(kind === 'airport' ? airportPlaces().find((p) => p.id === pid) : presetPlaces().find((p) => p.id === pid));
  };

  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="select" value={custom ? CUSTOM : selectValue} onChange={(e) => onSelect(e.target.value)}>
        <optgroup label={t('presetsAirports')}>
          {airportPlaces().map((p) => <option key={p.id} value={`airport:${p.id}`}>{p.name}</option>)}
        </optgroup>
        <optgroup label={t('presetsNeighborhoods')}>
          {presetPlaces().map((p) => <option key={p.id} value={`preset:${p.id}`}>{p.name}</option>)}
        </optgroup>
        <option value={CUSTOM}>{t('otherAddress')}</option>
      </select>
      {custom && (
        <div className="addr">
          <div className="addr-input">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="input"
              aria-label={t('searchAddress')}
              placeholder={t('searchAddress')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={`${id}-results`}
              aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
            />
            <button type="button" className="locate" onClick={locate} aria-label={t('useMyLocation')} title={t('useMyLocation')} disabled={locating}>
              <LocateFixed size={16} aria-hidden="true" />
            </button>
          </div>
          {locating && <p className="muted small">{t('locating')}</p>}
          {!query && recents.length > 0 && !results.length && (
            <ul className="addr-results" aria-label={t('recent')}>
              {recents.map((rp) => (
                <li key={rp.id}>
                  <button type="button" onClick={() => choose(rp)}>
                    <span className="addr-name"><Clock size={12} aria-hidden="true" /> {rp.name}</span>
                    <span className="addr-full">{rp.full}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {place.kind === 'custom' && !results.length && !query && (
            <p className="addr-current"><MapPin size={14} aria-hidden="true" /> {place.full ?? place.name}</p>
          )}
          {busy && <p className="muted small">{t('searching')}</p>}
          {err && <p className="muted small">{t('alertsFailed')}</p>}
          {!busy && query.trim().length >= 2 && results.length === 0 && !err && <p className="muted small">{t('noResults')}</p>}
          {results.length > 0 && (
            <ul className="addr-results" id={`${id}-results`} role="listbox" aria-label={t('searchAddress')}>
              {results.map((rslt, i) => (
                <li key={rslt.id}>
                  <button type="button" id={`${id}-opt-${i}`} role="option" aria-selected={i === active} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => choose(rslt)}>
                    <span className="addr-name">{rslt.name}</span>
                    <span className="addr-full">{rslt.full}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted tiny">{t('geocodeCredit')}</p>
        </div>
      )}
    </div>
  );
}

