import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { airports } from '../data/destinations.js';
import { AIRPORT_FACTS, SMALL_AIRPORTS, airportTransitLinks, pairKey } from '../data/airportFacts.js';
import { buildOptions } from '../lib/options.js';
import { annotateTimeValue, sortOptions, DEFAULT_VALUE_OF_TIME, fmtRange, fmtMin, fmtMoney } from '../lib/timeValue.js';
import { airportPlace, presetPlace, placeFromParam, placeToParam } from '../lib/geo.js';
import { localizeOptions, tx } from '../lib/routeText.js';
import { boardLinesFor } from '../lib/alerts.js';
import { flightsLink, nyDate } from '../lib/rebook.js';
import StatusBoard from '../components/StatusBoard.jsx';
import PlacePicker from '../components/PlacePicker.jsx';
import { Badges } from '../components/CompareTable.jsx';

const CODES = Object.keys(airports);
const PAIRS = [['JFK', 'LGA'], ['JFK', 'EWR'], ['LGA', 'EWR']];

function LineBadges({ lines }) {
  return (
    <span className="bullets" aria-hidden="true">
      {lines.map((l) => <span key={l} className={`bullet ${l === 'AT' ? 'sq k-airtrain' : `line-${l}`}`}>{l === 'LIRR' ? 'LI' : l}</span>)}
    </span>
  );
}

// Which airport is best for *your* destination: the same engine as Getting
// there, run once per airport, so the numbers match the main tab exactly.
export default function AirportsTab({ alerts, lang, t, params, setParams, openTransit }) {
  const init = useMemo(() => {
    const from = placeFromParam(params.from, null), to = placeFromParam(params.to, null);
    const other = [to, from].find((p) => p && p.kind !== 'airport');
    return { place: other ?? presetPlace('midtown'), direction: from && from.kind !== 'airport' ? 'to' : 'from' };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [place, setPlace] = useState(init.place);
  const [direction, setDirection] = useState(init.direction);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { setParams({ [direction === 'from' ? 'to' : 'from']: placeToParam(place) }); }, [place, direction]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => CODES.map((code) => {
    const ap = airportPlace(code);
    const { options, trip } = buildOptions({ origin: direction === 'from' ? ap : place, destination: direction === 'from' ? place : ap, date: new Date() });
    const ann = annotateTimeValue(options, DEFAULT_VALUE_OF_TIME);
    const cheapest = localizeOptions(sortOptions(ann, 'cheapest'), lang)[0];
    const fastest = localizeOptions(sortOptions(ann, 'fastest'), lang)[0];
    const transit = localizeOptions(sortOptions(ann.filter((o) => o.kind === 'transit'), 'fastest'), lang)[0] ?? null;
    return { code, cheapest, fastest, transit, miles: trip.miles, all: localizeOptions(ann, lang) };
  }), [place, direction, lang, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const boardLines = useMemo(() => boardLinesFor(rows.flatMap((r) => r.all)), [rows]);
  const cheapestAp = rows.reduce((a, b) => (b.cheapest && (!a.cheapest || b.cheapest.costMid < a.cheapest.costMid) ? b : a));
  const fastestAp = rows.reduce((a, b) => (b.fastest && (!a.fastest || b.fastest.timeMid < a.fastest.timeMid) ? b : a));
  const transitLinks = useMemo(() => airportTransitLinks(new Date()), []);
  const carBetween = useMemo(() => Object.fromEntries(PAIRS.map(([a, b]) => {
    const { options } = buildOptions({ origin: airportPlace(a), destination: airportPlace(b), date: new Date() });
    const taxi = localizeOptions(options.filter((o) => o.id === 'taxi'), lang)[0] ?? localizeOptions(sortOptions(annotateTimeValue(options), 'fastest'), lang)[0];
    return [pairKey(a, b), taxi];
  })), [lang, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = nyDate();
  const open = (code) => openTransit({ from: direction === 'from' ? code : placeToParam(place), to: direction === 'from' ? placeToParam(place) : code });

  return (
    <>
      <StatusBoard date={new Date()} lines={boardLines} alerts={alerts} lang={lang} t={t} />
      <main className="wrap airports">
        <section className="ap-head">
          <h1>{t('apTitle')}</h1>
          <p className="muted">{t('apLead')}</p>
          <div className="trip">
            <div className="segmented" role="radiogroup" aria-label={t('apDirection')}>
              {[['from', t('apLanding')], ['to', t('apFlying')]].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={direction === k} className={`seg ${direction === k ? 'on' : ''}`} onClick={() => setDirection(k)}>{label}</button>
              ))}
            </div>
            <PlacePicker id="ap-place" label={direction === 'from' ? t('to') : t('from')} place={place} setPlace={setPlace} t={t} />
          </div>
        </section>

        <section className="verdict" aria-live="polite">
          <div className="k">{t('bestNow')}</div>
          <h2>{cheapestAp.code === fastestAp.code
            ? t('apVerdictOne', { airport: cheapestAp.code, place: place.name })
            : t('apVerdictTwo', { cheap: cheapestAp.code, fast: fastestAp.code, place: place.name })}</h2>
          <p>{t('apVerdictDetail', {
            cheap: cheapestAp.code, cheapCost: fmtRange(cheapestAp.cheapest.cost), cheapName: cheapestAp.cheapest.name,
            fast: fastestAp.code, fastMin: fmtMin(fastestAp.fastest.time), fastName: fastestAp.fastest.name,
          })}</p>
        </section>

        <table className="cmp ap-table">
          <caption className="sr-only">{t('apTitle')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('airport')}</th>
              <th scope="col">{t('cheapest')}</th>
              <th scope="col">{t('fastest')}</th>
              <th scope="col" className="hide-sm">{t('apByTransit')}</th>
              <th scope="col" className="hide-sm">{t('apFlights')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className={`row ${r.code === cheapestAp.code || r.code === fastestAp.code ? 'best' : ''}`} onClick={() => open(r.code)}>
                <th scope="row">
                  <button type="button" className="rowbtn" onClick={() => open(r.code)}>
                    <span>
                      <span className="name">{r.code} <span className="muted small">{Math.round(r.miles)} mi</span></span>
                      <span className="sub">{airports[r.code].name}</span>
                    </span>
                  </button>
                </th>
                <td>{r.cheapest && <><Badges o={r.cheapest} /><span className="price">{fmtRange(r.cheapest.cost)}</span><span className="sub">{fmtMin(r.cheapest.time)} · {r.cheapest.name}</span></>}</td>
                <td>{r.fastest && <><Badges o={r.fastest} /><span className="price">{fmtMin(r.fastest.time)}</span><span className="sub">{fmtRange(r.fastest.cost)} · {r.fastest.name}</span></>}</td>
                <td className="hide-sm">{r.transit
                  ? <><Badges o={r.transit} /><span className="price">{fmtRange(r.transit.cost)}</span><span className="sub">{fmtMin(r.transit.time)} · {r.transit.name}</span></>
                  : <span className="muted">{t('apNoTransit')}</span>}</td>
                <td className="hide-sm"><a href={flightsLink({ from: r.code, date: today })} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{t('apSearchFlights')} <ExternalLink size={11} aria-hidden="true" /></a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tiny muted">{t('apTableNote')}</p>

        <div className="ap-cols">
          <section aria-labelledby="between-h">
            <h2 id="between-h">{t('apBetween')}</h2>
            <p className="muted small">{t('apBetweenLead')}</p>
            <ul className="pair-list">
              {PAIRS.map(([a, b]) => {
                const k = pairKey(a, b), tl = transitLinks[k], car = carBetween[k];
                return (
                  <li key={k}>
                    <b className="pair">{a} <ArrowRight size={13} aria-hidden="true" /> {b}</b>
                    <span className="pair-row">{car && <><Badges o={car} /> <span><b>{fmtRange(car.cost)}</b> · {fmtMin(car.time)} · {car.name}</span></>}</span>
                    {tl && <span className="pair-row"><LineBadges lines={tl.lines} /> <span><b>{fmtMoney(tl.cost)}</b> · {fmtMin(tl.time)} · {tx(lang, tl.steps)}</span></span>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="facts-h">
            <h2 id="facts-h">{t('apFacts')}</h2>
            <dl className="facts">
              {CODES.map((c) => {
                const f = AIRPORT_FACTS[c];
                return (
                  <div key={c}>
                    <dt>{c} <span className="muted">{airports[c].name}</span></dt>
                    <dd><LineBadges lines={f.transit} /> {tx(lang, f.transitText)}</dd>
                    <dd><span className="muted">{t('apTerminals')}:</span> {tx(lang, f.terminals)}</dd>
                    <dd><span className="muted">{t('apHubs')}:</span> {tx(lang, f.hubs)}</dd>
                    <dd>{tx(lang, f.note)}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>

        <section aria-labelledby="small-h" className="small-airports">
          <h2 id="small-h">{t('apSmall')}</h2>
          <p className="muted small">{t('apSmallLead')}</p>
          <ul className="small-list">
            {SMALL_AIRPORTS.map((a) => (
              <li key={a.code}>
                <b>{a.code} <span className="muted">{a.name}</span></b>
                <span className="sub">{tx(lang, a.where)}</span>
                <span className="sub">{tx(lang, a.transit)}</span>
                <span className="sub">{t('apFlightsBy')}: {a.flights} · <a href={flightsLink({ from: a.code, date: today })} target="_blank" rel="noopener noreferrer">{t('apSearchFlights')} <ExternalLink size={10} aria-hidden="true" /></a></span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
