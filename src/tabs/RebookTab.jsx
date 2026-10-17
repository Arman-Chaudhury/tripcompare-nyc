import { useEffect, useMemo, useState } from 'react';
import { Check, HelpCircle, X, ExternalLink, Plane, BedDouble, ArrowRight, Printer } from 'lucide-react';
import { airports } from '../data/destinations.js';
import { hotels, HOTELS_LAST_CHECKED } from '../data/hotels.js';
import { AIRPORT_FACTS, airportTransitLinks, pairKey } from '../data/airportFacts.js';
import { buildOptions } from '../lib/options.js';
import { annotateTimeValue, sortOptions, DEFAULT_VALUE_OF_TIME, fmtRange, fmtMin, fmtMoney } from '../lib/timeValue.js';
import { airportPlace, presetPlace, placeToParam } from '../lib/geo.js';
import { localizeOptions, tx } from '../lib/routeText.js';
import { boardLinesFor } from '../lib/alerts.js';
import { EVENTS, CAUSES, DELAY_HOURS, parseFlight, entitlements, flightsLink, hotelsLink, mapsLink, nyDate, RIGHTS_LAST_VERIFIED, RECLASSIFY_EFFECTIVE } from '../lib/rebook.js';
import StatusBoard from '../components/StatusBoard.jsx';
import { Badges } from '../components/CompareTable.jsx';

const STORE = 'tc.rebook.v1';
const STATUS_ICON = { yes: Check, maybe: HelpCircle, no: X };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SOURCES = [
  ['DOT: refunds', 'https://www.transportation.gov/airconsumer/refunds'],
  ['DOT: airline dashboard', 'https://www.transportation.gov/airconsumer/airline-customer-service-dashboard'],
  ['DOT: bumping', 'https://www.transportation.gov/individuals/aviation-consumer-protection/bumping-oversales'],
  ['EU 261', 'https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm'],
];

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { return {}; }
}
function writeStore(v) {
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* storage blocked */ }
}

// Fastest and cheapest ways from `airport` to `place` right now, for the
// "ride to the other airport" and "sleep in the city" rows.
function pick(airport, place, lang) {
  const { options } = buildOptions({ origin: airportPlace(airport), destination: place, date: new Date() });
  const ann = annotateTimeValue(options, DEFAULT_VALUE_OF_TIME);
  return {
    cheapest: localizeOptions(sortOptions(ann, 'cheapest'), lang)[0],
    fastest: localizeOptions(sortOptions(ann, 'fastest'), lang)[0],
  };
}

export default function RebookTab({ alerts, lang, t, openTransit }) {
  const stored = useMemo(() => readStore(), []);
  const [airport, setAirport] = useState(airports[stored.airport] ? stored.airport : 'JFK');
  const [event, setEvent] = useState('canceled');
  const [cause, setCause] = useState('unknown');
  const [hours, setHours] = useState(4);
  const [overnight, setOvernight] = useState(false);
  const [intl, setIntl] = useState(false);
  const [flightText, setFlightText] = useState('');
  const [destText, setDestText] = useState('');
  useEffect(() => { writeStore({ airport }); }, [airport]);

  const flight = parseFlight(flightText);
  const effectiveHours = event === 'canceled' ? Math.max(hours, 3) : hours;
  const rights = useMemo(
    () => entitlements({ event, cause, hours: effectiveHours, overnight, intl, airline: flight?.airline ?? null, date: new Date() }),
    [event, cause, effectiveHours, overnight, intl, flight?.code], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const airlineName = flight?.airline?.name ?? (flight ? flight.code : null);
  const others = Object.keys(airports).filter((c) => c !== airport);
  const today = nyDate();
  const transitLinks = useMemo(() => airportTransitLinks(new Date()), []);
  const rides = useMemo(() => Object.fromEntries(others.map((c) => [c, pick(airport, airportPlace(c), lang)])), [airport, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const city = useMemo(() => pick(airport, presetPlace('midtown'), lang), [airport, lang]);
  const boardLines = useMemo(() => boardLinesFor([city.cheapest, city.fastest].filter(Boolean)), [city]);
  const dest = destText.trim().toUpperCase().slice(0, 3);
  const destOk = /^[A-Z]{3}$/.test(dest);

  return (
    <>
      <StatusBoard date={new Date()} lines={boardLines} alerts={alerts} lang={lang} t={t} />
      <main className="wrap rebook">
        <section className="rb-form no-print" aria-labelledby="rb-h">
          <h1 id="rb-h">{t('rebookTitle')}</h1>
          <p className="muted">{t('rebookLead')}</p>

          <h2 className="label">{t('rbWhat')}</h2>
          <div className="segmented" role="radiogroup" aria-label={t('rbWhat')}>
            {EVENTS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={event === k} className={`seg ${event === k ? 'on' : ''}`} onClick={() => setEvent(k)}>{t(`ev${cap(k)}`)}</button>
            ))}
          </div>

          <h2 className="label">{t('rbWhy')}</h2>
          <div className="needs causes" role="radiogroup" aria-label={t('rbWhy')}>
            {CAUSES.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={cause === k} className={`need ${cause === k ? 'on' : ''}`} onClick={() => setCause(k)}>
                <span><b>{t(`cause${cap(k)}`)}</b><span className="sub">{t(`cause${cap(k)}Sub`)}</span></span>
              </button>
            ))}
          </div>

          <h2 className="label">{t('rbDetails')}</h2>
          <div className="rb-grid">
            <div className="field">
              <label className="label" htmlFor="rb-hours">{event === 'canceled' ? t('rbNextFlight') : t('rbHowLate')}</label>
              <select id="rb-hours" className="select" value={hours} onChange={(e) => setHours(+e.target.value)}>
                {DELAY_HOURS.map((h) => <option key={h} value={h}>{t('hoursPlus', { h })}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="rb-airport">{t('rbWhere')}</label>
              <select id="rb-airport" className="select" value={airport} onChange={(e) => setAirport(e.target.value)}>
                {Object.values(airports).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="rb-flight">{t('rbFlight')}</label>
              <input id="rb-flight" className="input mono" placeholder="DL 123" value={flightText} onChange={(e) => setFlightText(e.target.value)} autoCapitalize="characters" autoComplete="off" />
              <p className="tiny muted">{flight ? (flight.airline ? flight.airline.name : t('rbAirlineUnknown')) : t('rbFlightHint')}</p>
            </div>
            <div className="field">
              <label className="label" htmlFor="rb-dest">{t('rbDest')}</label>
              <input id="rb-dest" className="input mono" placeholder="LAX" maxLength={3} value={destText} onChange={(e) => setDestText(e.target.value)} autoCapitalize="characters" autoComplete="off" />
              <p className="tiny muted">{t('rbDestHint')}</p>
            </div>
          </div>
          <div className="checks">
            <label className="check"><input type="checkbox" checked={overnight} onChange={(e) => setOvernight(e.target.checked)} /> {t('rbOvernight')}</label>
            <label className="check"><input type="checkbox" checked={intl} onChange={(e) => setIntl(e.target.checked)} /> {t('rbIntl')}</label>
          </div>
        </section>

        <section className="rights" aria-labelledby="rights-h">
          <div className="k">{t('rightsKicker', { date: RIGHTS_LAST_VERIFIED })}</div>
          <h2 id="rights-h">{airlineName ? t('rightsHeadAirline', { airline: airlineName }) : t('rightsHead')}</h2>
          <ul className="rights-list">
            {rights.items.map(({ key, status, vars }) => {
              const Icon = STATUS_ICON[status];
              return (
                <li key={key} className={`r-${status}`}>
                  <span className={`mark-${status}`} aria-hidden="true"><Icon size={15} /></span>
                  <span>
                    <b>{t(`right_${key}`, vars)}</b> <span className="sr-only">{t(`status_${status}`)}</span>
                    <span className="sub">{t(`right_${key}_${status}`, vars)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {rights.flags.length > 0 && (
            <div className="notes">
              {rights.flags.map((f) => <p key={f}>{t(`flag_${f}`, { date: RECLASSIFY_EFFECTIVE })}</p>)}
            </div>
          )}

          <h3 className="label">{t('sayThis')}</h3>
          <blockquote className="script">{t(event === 'bumped' ? 'scriptBumped' : cause === 'weather' ? 'scriptWeather' : 'scriptControllable')}</blockquote>

          <h3 className="label">{t('doNow')}</h3>
          <ol className="todo">
            {['doLine', 'doWriting', 'doVoucher', 'doReceipts', 'doCard', 'doComplaint'].map((k) => <li key={k}>{t(k)}</li>)}
          </ol>
          <p className="tiny muted sources-line">
            {SOURCES.map(([label, href], i) => <span key={href}>{i > 0 && ' · '}<a href={href} target="_blank" rel="noopener noreferrer">{label} <ExternalLink size={10} aria-hidden="true" /></a></span>)}
          </p>
          <p className="no-print"><button type="button" className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> {t('print')}</button></p>
        </section>

        <section className="rb-alt" aria-labelledby="alt-h">
          <h2 id="alt-h"><Plane size={18} aria-hidden="true" /> {t('altHead')}</h2>
          <p className="muted">{t('altLead', { airport })}</p>
          <table className="cmp alt-table">
            <thead>
              <tr>
                <th scope="col">{t('airport')}</th>
                <th scope="col">{t('altFlights')}</th>
                <th scope="col">{t('altRide')}</th>
                <th scope="col" className="hide-sm">{t('altTransit')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="row">
                <th scope="row"><span className="name">{airport}</span><span className="sub">{t('altSame')}</span></th>
                <td><a className="btn" href={flightsLink({ from: airport, to: destOk ? dest : '', date: today })} target="_blank" rel="noopener noreferrer">{t('altSearch', { airport })} <ExternalLink size={12} aria-hidden="true" /></a></td>
                <td className="muted">—</td>
                <td className="hide-sm muted">—</td>
              </tr>
              {others.map((c) => {
                const r = rides[c], tl = transitLinks[pairKey(airport, c)];
                return (
                  <tr key={c} className="row">
                    <th scope="row"><span className="name">{c}</span><span className="sub">{airports[c].name}</span></th>
                    <td><a className="btn" href={flightsLink({ from: c, to: destOk ? dest : '', date: today })} target="_blank" rel="noopener noreferrer">{t('altSearch', { airport: c })} <ExternalLink size={12} aria-hidden="true" /></a></td>
                    <td>
                      {r.fastest && <><Badges o={r.fastest} /> <b>{fmtRange(r.fastest.cost)}</b> <span className="sub">{fmtMin(r.fastest.time)} · {r.fastest.name}</span></>}
                    </td>
                    <td className="hide-sm">
                      {tl && <><span className="bullets" aria-hidden="true">{tl.lines.map((l) => <span key={l} className={`bullet ${l === 'AT' ? 'sq k-airtrain' : `line-${l}`}`}>{l === 'LIRR' ? 'LI' : l}</span>)}</span> <b>{fmtMoney(tl.cost)}</b> <span className="sub">{fmtMin(tl.time)} · {tx(lang, tl.steps)}</span></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="tiny muted">{t('altNote')}</p>
        </section>

        <section className="rb-stay" aria-labelledby="stay-h">
          <h2 id="stay-h"><BedDouble size={18} aria-hidden="true" /> {t('stayHead')}</h2>
          <div className="stay-grid">
            <div>
              <h3 className="label">{t('stayNear', { airport })}</h3>
              <ul className="hotel-list">
                {hotels[airport].map((h) => (
                  <li key={h.name}>
                    <a href={mapsLink(`${h.name} ${airport}`)} target="_blank" rel="noopener noreferrer"><b>{h.name}</b></a>
                    <span className="sub">
                      {tx(lang, h.area)}{h.miles > 0 && ` · ~${h.miles} mi`} · {h.shuttle === 'walk' ? t('shuttleWalk') : h.shuttle ? t('shuttleYes') : t('shuttleNo')}
                      {h.note && <> · {tx(lang, h.note)}</>}
                    </span>
                  </li>
                ))}
              </ul>
              <p><a className="btn" href={hotelsLink(airports[airport].name)} target="_blank" rel="noopener noreferrer">{t('stayPrices')} <ExternalLink size={12} aria-hidden="true" /></a></p>
              <p className="tiny muted">{t('stayNote', { date: HOTELS_LAST_CHECKED })}</p>
            </div>
            <div>
              <h3 className="label">{t('stayCity')}</h3>
              <p className="muted small">{t('stayCityLead')}</p>
              <ul className="hotel-list">
                {[['cheapest', city.cheapest], ['fastest', city.fastest]].filter(([, o]) => o).map(([k, o]) => (
                  <li key={k}>
                    <span className="sub">{t(k)}</span>
                    <span className="name"><Badges o={o} /> {o.name}</span>
                    <span className="sub"><b>{fmtRange(o.cost)}</b> · {fmtMin(o.time)}</span>
                  </li>
                ))}
              </ul>
              <p><button type="button" className="btn btn-primary" onClick={() => openTransit({ from: placeToParam(airportPlace(airport)), to: 'midtown' })}>{t('openFull')} <ArrowRight size={16} aria-hidden="true" /></button></p>
              <p className="tiny muted">{tx(lang, AIRPORT_FACTS[airport].note)}</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
