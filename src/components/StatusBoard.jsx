import { RefreshCw, WifiOff } from 'lucide-react';
import { statusForLines } from '../lib/alerts.js';
import { localeFor } from '../lib/i18n.js';

// Departure-board strip: New York clock + live MTA status for the lines on
// this trip. Everything here is either the device clock or the live feed —
// no weather or AirTrain status is shown because neither has a free feed.
function nyClock(date, lang) {
  const fmt = new Intl.DateTimeFormat(localeFor(lang), { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' });
  return fmt.format(date).toUpperCase();
}

export default function StatusBoard({ date, lines, alerts, lang, t }) {
  const ago = alerts.data ? Math.max(0, Math.round((Date.now() - alerts.data.fetchedAt) / 60000)) : null;
  return (
    <div className="board" role="status" aria-live="polite">
      <div className="board-in">
        <span className="clock">{nyClock(date, lang)}</span>
        {lines.map((l) => {
          const s = statusForLines([l], alerts.data);
          const label = s.color === 'unknown' ? t('statusUnknown') : t(`status${s.color[0].toUpperCase()}${s.color.slice(1)}`);
          return (
            <span key={l} className="line-stat" title={s.items[0]?.header ?? label}>
              <i className={`dot dot-${s.color}`} aria-hidden="true" />
              <span className={`bullet line-${l}`}>{l === 'LIRR' ? 'LI' : l}</span>
              <span className="sr-only">{label}</span>
              {s.items.length > 0 && <span>{t('alertCount', { n: s.items.length })}</span>}
            </span>
          );
        })}
        <span className="age">
          {alerts.status === 'loading' && !alerts.data && <><RefreshCw size={12} aria-hidden="true" /> {t('alertsLoading')}</>}
          {alerts.status === 'offline' && <><WifiOff size={12} aria-hidden="true" /> {t('alertsOffline')}</>}
          {alerts.status === 'failed' && !alerts.data && t('alertsFailed')}
          {alerts.data && t('mtaAlertsAge', { ago: ago === 0 ? t('justNow') : `${ago} min` })}
        </span>
      </div>
    </div>
  );
}
