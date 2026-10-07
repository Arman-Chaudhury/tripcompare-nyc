import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wallet, Zap, Briefcase, Users, Accessibility, Printer, Share2, ArrowRight, Check } from 'lucide-react';
import { airports } from '../data/destinations.js';
import { buildOptions } from '../lib/options.js';
import { annotateTimeValue, sortOptions, DEFAULT_VALUE_OF_TIME, fmtRange, fmtMin } from '../lib/timeValue.js';
import { airportPlace, presetPlace, placeFromParam, placeToParam } from '../lib/geo.js';
import { makeT, languages } from '../lib/i18n.js';
import { NEEDS, MIN_PARTY, MAX_PARTY, applyNeed, needToQuery, needFromQuery, normalizeParty } from '../lib/assist.js';
import { boardLinesFor } from '../lib/alerts.js';
import StatusBoard from '../components/StatusBoard.jsx';
import PlacePicker from '../components/PlacePicker.jsx';
import Verdict from '../components/Verdict.jsx';
import { Badges } from '../components/CompareTable.jsx';

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://arman-chaudhury.github.io/tripcompare-nyc/';
const NEED_ICON = { cheapest: Wallet, fastest: Zap, luggage: Briefcase, group: Users, mobility: Accessibility };
const STORE = 'tc.assist.v1';
const TOP_N = 3;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// The staff member's own airport and the usual direction survive between
// shifts; everything else is per passenger.
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { return {}; }
}
function writeStore(v) {
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* storage blocked */ }
}

function nyClock(date, lang) {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function AssistTab({ alerts, lang, t, params, setParams, openTransit }) {
  // Initial trip: whatever the URL carries, else the remembered airport.
  const init = useMemo(() => {
    const stored = readStore();
    const from = placeFromParam(params.from, null);
    const to = placeFromParam(params.to, null);
    const fromAirport = from?.kind === 'airport', toAirport = to?.kind === 'airport';
    const direction = fromAirport ? 'from' : toAirport ? 'to' : (stored.direction ?? 'from');
    const airport = fromAirport ? from.id : toAirport ? to.id : (airports[stored.airport] ? stored.airport : 'JFK');
    const other = (direction === 'from' ? to : from) ?? presetPlace('midtown');
    const q = needFromQuery(params);
    const need = q.need ?? (params.sort === 'cheapest' || params.sort === 'fastest' ? params.sort : 'cheapest');
    return { direction, airport, other: other.kind === 'airport' ? presetPlace('midtown') : other, need, party: q.party };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [need, setNeed] = useState(init.need);
  const [party, setParty] = useState(init.party);
  const [direction, setDirection] = useState(init.direction);
  const [airport, setAirport] = useState(init.airport);
  const [other, setOther] = useState(init.other);
  const [handLang, setHandLang] = useState(lang);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { writeStore({ airport, direction }); }, [airport, direction]);

  const origin = direction === 'from' ? airportPlace(airport) : other;
  const destination = direction === 'from' ? other : airportPlace(airport);
  const query = useMemo(() => ({ from: placeToParam(origin), to: placeToParam(destination), ...needToQuery(need, party) }), [origin, destination, need, party]);
  useEffect(() => { setParams(query); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const { options, trip } = useMemo(() => buildOptions({ origin, destination, date: new Date() }), [origin, destination, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const needed = useMemo(() => applyNeed(options, { need, party }), [options, need, party]);
  const sorted = useMemo(() => sortOptions(annotateTimeValue(needed.options, DEFAULT_VALUE_OF_TIME), query.sort), [needed, query.sort]);
  const th = useMemo(() => makeT(handLang), [handLang]);
  const notes = [...trip.notes, ...needed.notes.map((n) => th(n.key, n.vars))];
  const best = sorted[0];
  const tip = best?.tips?.find((x) => x !== best.warnings.find((w) => w.level === 'warn')?.text) ?? best?.tips?.[0];
  const url = `${PUBLIC_URL.replace(/\/?$/, '/')}?${new URLSearchParams({ ...query, lang: handLang })}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: t('appName'), text: th('tagline'), url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* cancelled */ }
  };

  return (
    <>
      <StatusBoard date={now} lines={boardLinesFor(sorted)} alerts={alerts} lang={lang} t={t} />
      <main className="wrap assist">
        <section className="assist-form no-print" aria-labelledby="assist-h">
          <h1 id="assist-h">{t('assistTitle')}</h1>
          <p className="muted">{t('assistLead')}</p>

          <h2 className="label">{t('assistStep1')}</h2>
          <div className="needs" role="radiogroup" aria-label={t('assistStep1')}>
            {NEEDS.map((k) => {
              const Icon = NEED_ICON[k];
              return (
                <button key={k} type="button" role="radio" aria-checked={need === k} className={`need ${need === k ? 'on' : ''}`} onClick={() => setNeed(k)}>
                  <Icon size={18} aria-hidden="true" />
                  <span><b>{t(`need${cap(k)}`)}</b><span className="sub">{t(`need${cap(k)}Sub`)}</span></span>
                </button>
              );
            })}
          </div>
          {need === 'group' && (
            <div className="party">
              <label className="label" htmlFor="party">{t('partySize')}</label>
              <div className="stepper">
                <button type="button" onClick={() => setParty((p) => normalizeParty(p - 1))} disabled={party <= MIN_PARTY} aria-label="−">−</button>
                <input id="party" type="number" className="mono" min={MIN_PARTY} max={MAX_PARTY} value={party} onChange={(e) => setParty(normalizeParty(e.target.value))} />
                <button type="button" onClick={() => setParty((p) => normalizeParty(p + 1))} disabled={party >= MAX_PARTY} aria-label="+">+</button>
              </div>
            </div>
          )}

          <h2 className="label">{t('assistStep2')}</h2>
          <div className="trip">
            <div className="segmented" role="radiogroup" aria-label={t('assistStep2')}>
              {[['from', t('directionFrom')], ['to', t('directionTo')]].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={direction === k} className={`seg ${direction === k ? 'on' : ''}`} onClick={() => setDirection(k)}>{label}</button>
              ))}
            </div>
            <div className="trip-fields">
              <div className="field">
                <label className="label" htmlFor="assist-airport">{t('airport')}</label>
                <select id="assist-airport" className="select" value={airport} onChange={(e) => setAirport(e.target.value)}>
                  {Object.values(airports).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <PlacePicker id="assist-other" label={direction === 'from' ? t('to') : t('from')} place={other} setPlace={setOther} t={t} />
            </div>
          </div>

          <h2 className="label">{t('assistStep3')}</h2>
          <div className="segmented" role="radiogroup" aria-label={t('assistStep3')}>
            {languages.map((l) => (
              <button key={l.code} type="button" role="radio" aria-checked={handLang === l.code} className={`seg ${handLang === l.code ? 'on' : ''}`} onClick={() => setHandLang(l.code)}>{l.label}</button>
            ))}
          </div>
        </section>

        <section className="handout" lang={handLang} aria-label={th('handoutHead', { when: nyClock(now, handLang) })}>
          <div className="handout-head">
            <span className="mark"><b aria-hidden="true">TC</b> {th('appName')}</span>
            <span className="mono">{nyClock(now, handLang)}</span>
          </div>
          <p className="handout-trip"><span>{origin.name}</span> <ArrowRight size={14} aria-hidden="true" /> <span>{destination.name}</span></p>

          <Verdict options={sorted} sort={query.sort} valueOfTime={DEFAULT_VALUE_OF_TIME} useNow whenLabel="" notes={notes} t={th} />

          {sorted.length > 0 && (
            <ol className="handout-list" aria-label={th('handoutTop', { n: Math.min(TOP_N, sorted.length), total: sorted.length })}>
              {sorted.slice(0, TOP_N).map((o) => (
                <li key={o.id}>
                  <Badges o={o} />
                  <span className="hl-name">
                    <b>{o.name}</b>
                    {o.steps?.[0] && <span className="sub">{o.steps[0]}</span>}
                  </span>
                  <span className="hl-num num">
                    <b>{fmtRange(o.cost)}</b>
                    <span className="sub">{fmtMin(o.time)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {sorted.length > TOP_N && <p className="muted tiny">{th('handoutTop', { n: TOP_N, total: sorted.length })}</p>}
          {tip && <p className="handout-tip">{tip}</p>}

          <div className="handout-qr">
            <div className="qr-wrap"><QRCodeSVG value={url} size={168} level="M" includeMargin bgColor="#ffffff" fgColor="#111111" /></div>
            <div>
              <p><b>{th('handoutScan')}</b></p>
              <p className="url">{url}</p>
              <p className="muted tiny">{th('faresVerified', { date: '' }).replace(/\s+/g, ' ').trim()}</p>
            </div>
          </div>

          <div className="handout-actions no-print">
            <button type="button" className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> {t('print')}</button>
            <button type="button" className="btn" onClick={share}>{copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />} {copied ? t('copied') : t('share')}</button>
            <button type="button" className="btn btn-primary" onClick={() => openTransit(query)}>{t('openFull')} <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </section>
      </main>
    </>
  );
}
