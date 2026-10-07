import { useEffect, useMemo, useState } from 'react';
import { FARES_LAST_VERIFIED, fareSources } from './data/fares.js';
import { makeT, languages, detectLanguage } from './lib/i18n.js';
import { useAlerts } from './hooks/useAlerts.js';
import TransitTab from './tabs/TransitTab.jsx';
import AssistTab from './tabs/AssistTab.jsx';
import ComingSoonTab from './tabs/ComingSoonTab.jsx';
import StatusBoard from './components/StatusBoard.jsx';

const TABS = [
  { id: 'transit', key: 'tabTransit' },
  { id: 'assist', key: 'tabAssist' },
  { id: 'rebook', key: 'tabRebook', soon: true },
  { id: 'airports', key: 'tabAirports', soon: true },
];
// Trip state shared by the tabs and mirrored into the URL.
const TRIP_KEYS = ['from', 'to', 'sort', 'need', 'party'];

function readInitial() {
  const p = new URLSearchParams(window.location.search);
  let stored = null;
  try { stored = localStorage.getItem('tc.lang'); } catch { /* storage blocked */ }
  return {
    tab: TABS.some((x) => x.id === p.get('tab')) ? p.get('tab') : 'transit',
    lang: detectLanguage(p.get('lang'), stored),
    trip: Object.fromEntries(TRIP_KEYS.filter((k) => p.get(k)).map((k) => [k, p.get(k)])),
  };
}

export default function App() {
  const init = useMemo(() => readInitial(), []);
  const [tab, setTab] = useState(init.tab);
  const [lang, setLang] = useState(init.lang);
  const [tripParams, setTripParams] = useState(init.trip);
  const alerts = useAlerts();
  const t = useMemo(() => makeT(lang), [lang]);

  useEffect(() => {
    try { localStorage.setItem('tc.lang', lang); } catch { /* storage blocked */ }
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const p = new URLSearchParams({ ...tripParams, lang });
    if (tab !== 'transit') p.set('tab', tab);
    window.history.replaceState(null, '', `?${p}`);
  }, [tab, tripParams, lang]);

  // From Help a passenger: open the full comparison for the handed-over trip.
  const openTransit = (params) => { setTripParams(params); setTab('transit'); };

  return (
    <div className="app">
      <header className="top">
        <div className="top-in">
          <p className="mark"><b aria-hidden="true">TC</b><span>{t('appName')}</span></p>
          <nav role="tablist" aria-label={t('appName')}>
            {TABS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}>
                {t(x.key)}{x.soon && <span className="soon">{t('soon')}</span>}
              </button>
            ))}
          </nav>
          <label className="lang">
            <span className="sr-only">{t('language')}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')}>
              {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      {tab === 'transit' && <TransitTab alerts={alerts} lang={lang} t={t} params={tripParams} setParams={setTripParams} />}
      {tab === 'assist' && <AssistTab alerts={alerts} lang={lang} t={t} params={tripParams} setParams={setTripParams} openTransit={openTransit} />}
      {tab !== 'transit' && tab !== 'assist' && (
        <>
          <StatusBoard date={new Date()} lines={['E', 'A', 'LIRR']} alerts={alerts} lang={lang} t={t} />
          <ComingSoonTab tab={tab} t={t} onBack={() => setTab('transit')} />
        </>
      )}

      <footer className="foot">
        <p className="verified-line">{t('faresVerified', { date: FARES_LAST_VERIFIED })}</p>
        <details>
          <summary>{t('sources')}</summary>
          <ul>
            {fareSources().map((s) => (
              <li key={s.source}><a href={s.source} target="_blank" rel="noopener noreferrer">{s.source.replace(/^https?:\/\//, '')}</a></li>
            ))}
          </ul>
        </details>
        <p>{t('disclaimer')}</p>
        <p>{t('installHint')}</p>
        <p>{t('mapCredit')} · Live traffic layer © Waze</p>
      </footer>
    </div>
  );
}
