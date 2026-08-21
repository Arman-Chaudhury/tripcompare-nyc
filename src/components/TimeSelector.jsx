import { Clock, CloudRain, Snowflake, Sun } from 'lucide-react';

function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function TimeSelector({ useNow, setUseNow, customDate, setCustomDate, weather, setWeather, t }) {
  return (
    <section className="panel" aria-label={t('leaving')}>
      <div className="field">
        <span className="label" id="leaving-label">
          <Clock size={16} aria-hidden="true" /> {t('leaving')}
        </span>
        <div className="row">
          <div className="segmented" role="radiogroup" aria-labelledby="leaving-label">
            <button type="button" role="radio" aria-checked={useNow} className={`seg ${useNow ? 'on' : ''}`} onClick={() => setUseNow(true)}>
              {t('now')}
            </button>
            <button type="button" role="radio" aria-checked={!useNow} className={`seg ${!useNow ? 'on' : ''}`} onClick={() => setUseNow(false)}>
              {t('pickTime')}
            </button>
          </div>
          {!useNow && (
            <input
              type="datetime-local"
              className="select"
              aria-label={t('pickTime')}
              value={toLocalInput(customDate)}
              onChange={(e) => e.target.value && setCustomDate(new Date(e.target.value))}
            />
          )}
        </div>
      </div>
      <div className="field">
        <span className="label" id="weather-label">
          <Sun size={16} aria-hidden="true" /> {t('weather')}
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="weather-label">
          {[
            ['clear', Sun, t('clear')],
            ['rain', CloudRain, t('rain')],
            ['snow', Snowflake, t('snow')],
          ].map(([k, Icon, label]) => (
            <button key={k} type="button" role="radio" aria-checked={weather === k} className={`seg ${weather === k ? 'on' : ''}`} onClick={() => setWeather(k)}>
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
