import { ArrowLeftRight } from 'lucide-react';
import PlacePicker from './PlacePicker.jsx';

function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const VOT_STEPS = [10, 15, 25, 40, 60, 100, 150];

// One bar for the whole trip: from ⇄ to, when, weather, and what your time is worth.
export default function RouteBar({ origin, setOrigin, destination, setDestination, useNow, setUseNow, customDate, setCustomDate, weather, setWeather, valueOfTime, setValueOfTime, t }) {
  const swap = () => { const o = origin; setOrigin(destination); setDestination(o); };
  return (
    <section className="route" aria-label={`${t('from')} / ${t('to')}`}>
      <div className="cell c-from"><PlacePicker id="origin" label={t('from')} place={origin} setPlace={setOrigin} t={t} /></div>
      <button type="button" className="swap" onClick={swap} aria-label={t('swap')} title={t('swap')}>
        <ArrowLeftRight size={17} aria-hidden="true" />
      </button>
      <div className="cell c-to"><PlacePicker id="destination" label={t('to')} place={destination} setPlace={setDestination} t={t} /></div>
      <div className="cell c-when">
        <label className="label" htmlFor="when">{t('leaving')}</label>
        <select id="when" className="select" value={useNow ? 'now' : 'pick'} onChange={(e) => setUseNow(e.target.value === 'now')}>
          <option value="now">{t('now')}</option>
          <option value="pick">{t('pickTime')}</option>
        </select>
        {!useNow && (
          <input type="datetime-local" aria-label={t('pickTime')} value={toLocalInput(customDate)} onChange={(e) => e.target.value && setCustomDate(new Date(e.target.value))} />
        )}
      </div>
      <div className="cell c-weather">
        <label className="label" htmlFor="weather">{t('weather')}</label>
        <select id="weather" className="select" value={weather} onChange={(e) => setWeather(e.target.value)}>
          <option value="clear">{t('clear')}</option>
          <option value="rain">{t('rain')}</option>
          <option value="snow">{t('snow')}</option>
        </select>
      </div>
      <div className="cell c-vot">
        <label className="label" htmlFor="vot">{t('valueOfTime')}</label>
        <select id="vot" className="select mono" value={valueOfTime} onChange={(e) => setValueOfTime(+e.target.value)}>
          {VOT_STEPS.map((v) => <option key={v} value={v}>${v}{t('perHour')}</option>)}
        </select>
      </div>
    </section>
  );
}
