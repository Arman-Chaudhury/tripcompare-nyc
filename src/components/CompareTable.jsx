import { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { statusForLines } from '../lib/alerts.js';
import { fmtRange, fmtMin } from '../lib/timeValue.js';
import StatusDot from './StatusDot.jsx';
import ResultCard from './ResultCard.jsx';

const rate = (n) => (Number.isFinite(n) ? `$${Math.round(n)}` : '∞');

export default function CompareTable({ options, alerts, bestValueId, t, lang, selectedId, onSelect }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="table-wrap">
      <table className="cmp">
        <thead>
          <tr>
            <th scope="col">{t('mode')}</th>
            <th scope="col" className="num">{t('cost')}</th>
            <th scope="col" className="num">{t('timeCol')}</th>
            <th scope="col" className="num">{t('perMile')}</th>
            <th scope="col" className="num">{t('costPerMin')}</th>
            <th scope="col" className="tvcol">{t('timeValueCol')}</th>
            <th scope="col" className="sr-only">{t('details')}</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => {
            const status = o.kind === 'transit' ? statusForLines(o.lines, alerts) : null;
            const statusLabel = status ? t(`status${status.color[0].toUpperCase()}${status.color.slice(1)}`) : '';
            const isOpen = open === o.id;
            return (
              <Fragment key={o.id}>
                <tr className={`${isOpen ? 'open' : ''} ${selectedId === o.id ? 'selected' : ''}`}>
                  <th scope="row">
                    <button type="button" className="rowbtn" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : o.id); onSelect?.(o.id); }}>
                      <span className="rowname">
                        {status && status.color !== 'none' && <StatusDot color={status.color} label={statusLabel} />}
                        {o.name}
                      </span>
                      <span className="rowmeta">
                        {o.lines.map((l) => <span key={l} className={`bullet line-${l}`}>{l}</span>)}
                        {o.tv.isCheapest && <span className="tag">{t('cheapestBadge')}</span>}
                        {o.tv.isFastest && <span className="tag">{t('fastestBadge')}</span>}
                        {o.id === bestValueId && <span className="tag tag-strong">{t('bestValueBadge')}</span>}
                        {o.promo && <span className="tag tag-promo">{t('promoActive')}</span>}
                      </span>
                    </button>
                  </th>
                  <td className="num">
                    <div className="cell-main">{fmtRange(o.cost)}</div>
                    <div className={`cell-sub kind-${o.costKind}`}>{o.costKind === 'verified' ? t('verifiedFare') : t('estimate')}</div>
                  </td>
                  <td className="num">
                    <div className="cell-main">{fmtMin(o.time)}</div>
                  </td>
                  <td className="num">
                    <div className="cell-main">${o.costPerMile.toFixed(2)}</div>
                    <div className="cell-sub">${o.costPerMileRange[0].toFixed(2)}–{o.costPerMileRange[1].toFixed(2)}</div>
                  </td>
                  <td className="num">
                    <div className="cell-main">${o.costPerMin.toFixed(2)}</div>
                    <div className="cell-sub">${o.costPerMinRange[0].toFixed(2)}–{o.costPerMinRange[1].toFixed(2)}</div>
                  </td>
                  <td className="tvcol">
                    {o.tv.isCheapest && o.tv.isFastest && <span className="muted">—</span>}
                    {o.tv.vsCheapest && (
                      <div className="cell-sub tv-pay">
                        {Number.isFinite(o.tv.vsCheapest.perHour)
                          ? t('vsCheapestShort', { rate: rate(o.tv.vsCheapest.perHour), min: Math.round(o.tv.vsCheapest.minSaved) })
                          : t('paysButSlower', { extra: `$${Math.round(o.tv.vsCheapest.extraCost)}` })}
                      </div>
                    )}
                    {o.tv.vsFastest && <div className="cell-sub tv-earn">{t('vsFastestShort', { rate: rate(o.tv.vsFastest.perHour), min: Math.round(o.tv.vsFastest.extraMin) })}</div>}
                    {o.tv.isCheapest && !o.tv.isFastest && <div className="cell-sub muted">{t('cheapestBadge')} · {t('baseline')}</div>}
                    {o.tv.isFastest && !o.tv.isCheapest && !o.tv.vsCheapest && <div className="cell-sub muted">{t('fastestBadge')} · {t('baseline')}</div>}
                    {o.deepLinks && (
                      <div className="cell-links">
                        {Object.entries(o.deepLinks).map(([k, href]) => (
                          <a key={k} href={href} target="_blank" rel="noopener noreferrer">{o.kind === 'rideshare' ? t('exactPriceIn', { app: o.provider }) : t('book')} <ExternalLink size={11} aria-hidden="true" /></a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="chevcell" aria-hidden="true">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                </tr>
                {isOpen && (
                  <tr className="detail-row">
                    <td colSpan={7}>
                      <ResultCard o={o} alerts={alerts} isBestValue={o.id === bestValueId} t={t} lang={lang} embedded />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
