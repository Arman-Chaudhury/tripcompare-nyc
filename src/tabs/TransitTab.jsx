import { useEffect, useMemo, useState } from 'react';
import { airports, destinationById } from '../data/destinations.js';
import { buildOptions } from '../lib/options.js';
import { annotateTimeValue, sortOptions, DEFAULT_VALUE_OF_TIME } from '../lib/timeValue.js';
import { formatTimeLabel } from '../lib/traffic.js';
import { airportPlace, presetPlace } from '../lib/geo.js';
import StatusBoard from '../components/StatusBoard.jsx';
import RouteBar from '../components/RouteBar.jsx';
import Verdict from '../components/Verdict.jsx';
import CompareTable from '../components/CompareTable.jsx';
import RouteMap from '../components/RouteMap.jsx';
import ShareQR from '../components/ShareQR.jsx';

const DEFAULT_BOARD_LINES = ['E', 'A', 'LIRR'];

function placeFromParam(v, fallback) {
  if (!v) return fallback;
  if (airports[v]) return airportPlace(v);
  if (destinationById[v]) return presetPlace(v);
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(.*))?$/.exec(v);
  if (m) return { kind: 'custom', id: `pt-${m[1]},${m[2]}`, name: m[3] ? decodeURIComponent(m[3]) : `${m[1]}, ${m[2]}`, lat: +m[1], lng: +m[2] };
  return fallback;
}
const placeToParam = (p) => (p.kind === 'custom' ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${encodeURIComponent(p.name)}` : p.id);

export default function TransitTab({ alerts, lang, t, setParams }) {
  const init = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return { origin: placeFromParam(p.get('from'), airportPlace('JFK')), destination: placeFromParam(p.get('to'), presetPlace('midtown')) };
  }, []);
  const [origin, setOrigin] = useState(init.origin);
  const [destination, setDestination] = useState(init.destination);
  const [useNow, setUseNow] = useState(true);
  const [customDate, setCustomDate] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [weather, setWeather] = useState('clear');
  const [sort, setSort] = useState('value');
  const [selectedId, setSelectedId] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const [valueOfTime, setValueOfTime] = useState(DEFAULT_VALUE_OF_TIME);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { setParams({ from: placeToParam(origin), to: placeToParam(destination) }); }, [origin, destination]); // eslint-disable-line react-hooks/exhaustive-deps

  const dateKey = useNow ? tick : customDate.getTime();
  const roadOverride = routes?.[routeIndex] ?? routes?.[0] ?? null;
  const { options, profile, trip } = useMemo(
    () => buildOptions({ origin, destination, date: useNow ? new Date() : customDate, weather, roadOverride }),
    [origin, destination, useNow, customDate, weather, dateKey, roadOverride], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const onRoutesLoaded = (rs) => { setRoutes(rs); setRouteIndex(0); };
  const annotated = useMemo(() => annotateTimeValue(options, valueOfTime), [options, valueOfTime]);
  const sorted = useMemo(() => sortOptions(annotated, sort), [annotated, sort]);
  const boardLines = useMemo(() => {
    const ls = [...new Set(sorted.filter((o) => o.kind === 'transit').flatMap((o) => o.lines))].filter((l) => /^[A-Z0-9]$|^LIRR$/.test(l));
    return ls.length ? ls : DEFAULT_BOARD_LINES;
  }, [sorted]);
  const now = new Date();
  const best = sorted[0];
  const bestTip = best?.tips?.find((x) => x !== (best.warnings.find((w) => w.level === 'warn')?.text ?? best.tips?.[0]));

  return (
    <>
      <StatusBoard date={now} lines={boardLines} alerts={alerts} lang={lang} t={t} />
      <main className="wrap">
        <RouteBar
          origin={origin} setOrigin={setOrigin} destination={destination} setDestination={setDestination}
          useNow={useNow} setUseNow={setUseNow} customDate={customDate} setCustomDate={setCustomDate}
          weather={weather} setWeather={setWeather} valueOfTime={valueOfTime} setValueOfTime={setValueOfTime} t={t}
        />
        <div className="layout">
          <Verdict options={sorted} sort={sort} valueOfTime={valueOfTime} useNow={useNow} whenLabel={formatTimeLabel(customDate, lang)} notes={trip.notes} t={t} />

          <section className="list" aria-label={t('results', { n: sorted.length })}>
            <div className="bar">
              <h2>{t('waysThere', { n: sorted.length })}</h2>
              <div className="segmented" role="radiogroup" aria-label={t('sortBy')}>
                {[['value', t('bestValue')], ['cheapest', t('cheapest')], ['fastest', t('fastest')]].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={sort === k} className={`seg ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{label}</button>
                ))}
              </div>
            </div>
            {sorted.length > 0 && <CompareTable options={sorted} alerts={alerts.data} bestId={best?.id} t={t} lang={lang} selectedId={selectedId} onSelect={setSelectedId} />}
            <p className="muted tiny" style={{ marginTop: 8 }}>{t('assumes', { label: t(`traffic${profile.key[0].toUpperCase()}${profile.key.slice(1)}`), day: profile.dayName, time: formatTimeLabel(useNow ? now : customDate, lang).split(' ').slice(-2).join(' ') })}</p>
          </section>

          <aside className="side">
            <RouteMap origin={origin} destination={destination} options={sorted} profile={profile} selectedId={selectedId} onSelect={setSelectedId} routeIndex={routeIndex} onRouteChange={setRouteIndex} onRoutesLoaded={onRoutesLoaded} t={t} />
            {bestTip && <div className="tipbox"><div><b>{best.name}</b>{bestTip}</div></div>}
            <ShareQR t={t} />
          </aside>
        </div>
      </main>
    </>
  );
}
