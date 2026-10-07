import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { buildOptions } from '../lib/options.js';
import { annotateTimeValue, sortOptions, DEFAULT_VALUE_OF_TIME } from '../lib/timeValue.js';
import { formatTimeLabel } from '../lib/traffic.js';
import { airportPlace, presetPlace, placeFromParam, placeToParam } from '../lib/geo.js';
import { applyNeed, needFromQuery } from '../lib/assist.js';
import { boardLinesFor } from '../lib/alerts.js';
import StatusBoard from '../components/StatusBoard.jsx';
import RouteBar from '../components/RouteBar.jsx';
import Verdict from '../components/Verdict.jsx';
import CompareTable from '../components/CompareTable.jsx';
import RouteMap from '../components/RouteMap.jsx';
import ShareQR from '../components/ShareQR.jsx';

const SORTS = ['value', 'cheapest', 'fastest'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// `params` is the shared trip state (from, to, sort, need, party) that App
// mirrors into the URL; the Help-a-passenger tab hands the same shape over.
export default function TransitTab({ alerts, lang, t, params, setParams }) {
  const init = useMemo(() => ({
    origin: placeFromParam(params.from, airportPlace('JFK')),
    destination: placeFromParam(params.to, presetPlace('midtown')),
    sort: SORTS.includes(params.sort) ? params.sort : 'value',
    ...needFromQuery(params),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [origin, setOrigin] = useState(init.origin);
  const [destination, setDestination] = useState(init.destination);
  const [useNow, setUseNow] = useState(true);
  const [customDate, setCustomDate] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [weather, setWeather] = useState('clear');
  const [sort, setSort] = useState(init.sort);
  const [need, setNeed] = useState(init.need);
  const [party] = useState(init.party);
  const [selectedId, setSelectedId] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const [valueOfTime, setValueOfTime] = useState(DEFAULT_VALUE_OF_TIME);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setParams({
      from: placeToParam(origin),
      to: placeToParam(destination),
      ...(sort !== 'value' && { sort }),
      ...(need && { need }),
      ...(need === 'group' && { party: String(party) }),
    });
  }, [origin, destination, sort, need, party]); // eslint-disable-line react-hooks/exhaustive-deps

  const dateKey = useNow ? tick : customDate.getTime();
  const roadOverride = routes?.[routeIndex] ?? routes?.[0] ?? null;
  const { options, profile, trip } = useMemo(
    () => buildOptions({ origin, destination, date: useNow ? new Date() : customDate, weather, roadOverride }),
    [origin, destination, useNow, customDate, weather, dateKey, roadOverride], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const onRoutesLoaded = (rs) => { setRoutes(rs); setRouteIndex(0); };
  const needed = useMemo(() => applyNeed(options, { need, party }), [options, need, party]);
  const annotated = useMemo(() => annotateTimeValue(needed.options, valueOfTime), [needed, valueOfTime]);
  const sorted = useMemo(() => sortOptions(annotated, sort), [annotated, sort]);
  const boardLines = useMemo(() => boardLinesFor(sorted), [sorted]);
  const notes = [...trip.notes, ...needed.notes.map((n) => t(n.key, n.vars))];
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
          <Verdict options={sorted} sort={sort} valueOfTime={valueOfTime} useNow={useNow} whenLabel={formatTimeLabel(customDate, lang)} notes={notes} t={t} />

          <section className="list" aria-label={t('results', { n: sorted.length })}>
            <div className="bar">
              <h2>{t('waysThere', { n: sorted.length })}</h2>
              {need && (
                <span className="filter-chip">
                  {t('filterChip', { need: need === 'group' ? `${t('needGroup')} · ${party}` : t(`need${cap(need)}`) })}
                  <button type="button" onClick={() => setNeed(null)} aria-label={t('clearFilter')} title={t('clearFilter')}><X size={13} aria-hidden="true" /></button>
                </span>
              )}
              <div className="segmented" role="radiogroup" aria-label={t('sortBy')}>
                {[['value', t('bestValue')], ['cheapest', t('cheapest')], ['fastest', t('fastest')]].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={sort === k} className={`seg ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{label}</button>
                ))}
              </div>
            </div>
            {sorted.length > 0 && <CompareTable options={sorted} alerts={alerts.data} bestId={best?.id} t={t} lang={lang} selectedId={selectedId} onSelect={setSelectedId} />}
            <p className="muted tiny" style={{ marginTop: 8 }}>{t('assumes', { label: t(`traffic${cap(profile.key)}`), day: profile.dayName, time: formatTimeLabel(useNow ? now : customDate, lang).split(' ').slice(-2).join(' ') })}</p>
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
