import { useEffect, useMemo, useState } from 'react';
import { Globe, WifiOff, RefreshCw, Info } from 'lucide-react';
import { airports, destinationById } from './data/destinations.js';
import { FARES_LAST_VERIFIED, fareSources } from './data/fares.js';
import { buildOptions } from './lib/options.js';
import { annotateTimeValue, sortOptions, DEFAULT_VALUE_OF_TIME } from './lib/timeValue.js';
import { formatTimeLabel } from './lib/traffic.js';
import { makeT, languages } from './lib/i18n.js';
import { airportPlace, presetPlace } from './lib/geo.js';
import { useAlerts } from './hooks/useAlerts.js';
import TripSelector from './components/TripSelector.jsx';
import TimeSelector from './components/TimeSelector.jsx';
import ResultCard from './components/ResultCard.jsx';
import CompareTable from './components/CompareTable.jsx';
import CompareChart from './components/CompareChart.jsx';
import RouteMap from './components/RouteMap.jsx';
import ShareQR from './components/ShareQR.jsx';

const TRAFFIC_KEY = { amRush: 'trafficAmRush', pmRush: 'trafficPmRush', lateNight: 'trafficLateNight', weekendMidday: 'trafficWeekendMidday', midday: 'trafficMidday', evening: 'trafficEvening', offPeak: 'trafficOffPeak' };

function placeFromParam(v, fallback) {
  if (!v) return fallback;
  if (airports[v]) return airportPlace(v);
  if (destinationById[v]) return presetPlace(v);
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(.*))?$/.exec(v);
  if (m) return { kind: 'custom', id: `pt-${m[1]},${m[2]}`, name: m[3] ? decodeURIComponent(m[3]) : `${m[1]}, ${m[2]}`, lat: +m[1], lng: +m[2] };
  return fallback;
}
const placeToParam = (p) => (p.kind === 'custom' ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${encodeURIComponent(p.name)}` : p.id);

function readParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    origin: placeFromParam(p.get('from'), airportPlace('JFK')),
    destination: placeFromParam(p.get('to'), presetPlace('midtown')),
    lang: p.get('lang') === 'es' ? 'es' : (localStorage.getItem('tc.lang') ?? (navigator.language.startsWith('es') ? 'es' : 'en')),
  };
}

export default function App() {
  const init = useMemo(() => readParams(), []);
  const [origin, setOrigin] = useState(init.origin);
  const [destination, setDestination] = useState(init.destination);
  const [lang, setLang] = useState(init.lang);
  const [useNow, setUseNow] = useState(true);
  const [customDate, setCustomDate] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [weather, setWeather] = useState('clear');
  const [sort, setSort] = useState('value');
  const [view, setView] = useState('table');
  const [selectedId, setSelectedId] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const [valueOfTime, setValueOfTime] = useState(DEFAULT_VALUE_OF_TIME);
  const alerts = useAlerts();
  const t = useMemo(() => makeT(lang), [lang]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    localStorage.setItem('tc.lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const p = new URLSearchParams({ from: placeToParam(origin), to: placeToParam(destination), lang });
    window.history.replaceState(null, '', `?${p}`);
  }, [origin, destination, lang]);

  const date = useNow ? new Date() : customDate;
  const dateKey = useNow ? tick : customDate.getTime();
  const roadOverride = routes?.[routeIndex] ?? routes?.[0] ?? null;
  const { options, profile, trip } = useMemo(
    () => buildOptions({ origin, destination, date: useNow ? new Date() : customDate, weather, roadOverride }),
    [origin, destination, useNow, customDate, weather, dateKey, roadOverride],
  );
  const onRoutesLoaded = (rs) => { setRoutes(rs); setRouteIndex(0); };
  const annotated = useMemo(() => annotateTimeValue(options, valueOfTime), [options, valueOfTime]);
  const sorted = useMemo(() => sortOptions(annotated, sort), [annotated, sort]);
  const bestValueId = useMemo(() => sortOptions(annotated, 'value')[0]?.id, [annotated]);
  const ago = alerts.data ? Math.max(0, Math.round((Date.now() - alerts.data.fetchedAt) / 60000)) : null;
  const clock = formatTimeLabel(date, lang).split(' ').slice(-2).join(' ');

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1 className="brand">{t('appName')}</h1>
          <p className="tagline">{t('tagline')}</p>
        </div>
        <label className="lang">
          <Globe size={15} aria-hidden="true" />
          <span className="sr-only">{t('language')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')}>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
      </header>

      <main>
        <TripSelector origin={origin} setOrigin={setOrigin} destination={destination} setDestination={setDestination} t={t} />
        <TimeSelector useNow={useNow} setUseNow={setUseNow} customDate={customDate} setCustomDate={setCustomDate} weather={weather} setWeather={setWeather} t={t} />

        <section className="panel controls" aria-label={t('sortBy')}>
          <div className="controls-row">
            <div className="field">
              <span className="label" id="sort-label">{t('sortBy')}</span>
              <div className="segmented" role="radiogroup" aria-labelledby="sort-label">
                {[['cheapest', t('cheapest')], ['fastest', t('fastest')], ['value', t('bestValue')]].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={sort === k} className={`seg ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label" id="view-label">{t('details')}</span>
              <div className="segmented" role="tablist" aria-labelledby="view-label">
                {[['table', t('viewTable')], ['cards', t('viewCards')], ['chart', t('viewChart')], ['map', t('viewMap')]].map(([k, label]) => (
                  <button key={k} type="button" role="tab" aria-selected={view === k} className={`seg ${view === k ? 'on' : ''}`} onClick={() => setView(k)}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          {sort === 'value' && (
            <div className="field">
              <label className="label" htmlFor="vot">{t('valueOfTime')}: <strong>${valueOfTime}{t('perHour')}</strong></label>
              <input id="vot" type="range" min="5" max="150" step="5" value={valueOfTime} onChange={(e) => setValueOfTime(+e.target.value)} />
            </div>
          )}
        </section>

        <div className="meta-row">
          <p className="assumption">
            {t('results', { n: sorted.length })} · {t('assumes', { label: t(TRAFFIC_KEY[profile.key]), day: profile.dayName, time: clock })}
          </p>
          <p className="status-bar" role="status" aria-live="polite">
            {alerts.status === 'loading' && !alerts.data && <><RefreshCw size={13} className="spin" aria-hidden="true" /> {t('alertsLoading')}</>}
            {alerts.status === 'offline' && <><WifiOff size={13} aria-hidden="true" /> {t('alertsOffline')}</>}
            {alerts.status === 'failed' && !alerts.data && t('alertsFailed')}
            {alerts.data && alerts.status !== 'ok' && ago != null && ` (${t('statusStale', { ago: `${ago} min` })})`}
            {alerts.status === 'ok' && <>MTA live alerts · {t('statusStale', { ago: ago === 0 ? 'just now' : `${ago} min` })}</>}
          </p>
        </div>
        {trip.notes.length > 0 && (
          <div className="trip-notes">
            {trip.notes.map((n, i) => <p key={i}><Info size={13} aria-hidden="true" /> {n}</p>)}
          </div>
        )}

        {sorted.length === 0 && <p className="muted">{t('noOptions')}</p>}
        <RouteMap origin={origin} destination={destination} options={sorted} profile={profile} selectedId={selectedId} onSelect={setSelectedId} routeIndex={routeIndex} onRouteChange={setRouteIndex} onRoutesLoaded={onRoutesLoaded} t={t} />
        {view === 'table' && sorted.length > 0 && <CompareTable options={sorted} alerts={alerts.data} bestValueId={bestValueId} t={t} lang={lang} selectedId={selectedId} onSelect={setSelectedId} />}
        {view === 'cards' && (
          <div className="cards">
            {sorted.map((o) => <ResultCard key={o.id} o={o} alerts={alerts.data} isBestValue={o.id === bestValueId} t={t} lang={lang} onSelect={() => setSelectedId(o.id)} />)}
          </div>
        )}
        {view === 'chart' && sorted.length > 1 && <CompareChart options={sorted} t={t} />}

        <ShareQR t={t} />
      </main>

      <footer className="foot">
        <p><strong>{t('faresVerified', { date: FARES_LAST_VERIFIED })}</strong></p>
        <details>
          <summary>{t('sources')}</summary>
          <ul>
            {fareSources().map((s) => (
              <li key={s.source}><a href={s.source} target="_blank" rel="noopener noreferrer">{s.source.replace(/^https?:\/\//, '')}</a></li>
            ))}
          </ul>
        </details>
        <p className="small muted">{t('disclaimer')}</p>
        <p className="small muted">{t('installHint')}</p>
        <p className="small muted">{t('mapCredit')} · Live traffic layer © Waze</p>
      </footer>
    </div>
  );
}
