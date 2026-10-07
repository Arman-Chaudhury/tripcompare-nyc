import { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { statusForLines } from '../lib/alerts.js';
import { fmtRange, fmtMin } from '../lib/timeValue.js';
import ResultCard from './ResultCard.jsx';

const KIND_BADGE = { taxi: 'TAXI', shuttle: 'VAN', carservice: 'CAR', air: 'HELI', bike: 'BIKE' };

export function Badges({ o }) {
  const out = [];
  if (/airtrain/i.test(o.name)) out.push(<span key="at" className="bullet sq k-airtrain">AT</span>);
  for (const l of o.lines) out.push(<span key={l} className={`bullet line-${l}`}>{l}</span>);
  if (o.kind === 'rideshare') out.push(<span key="rs" className={`bullet sq k-${o.provider.toLowerCase()}`}>{o.provider.toUpperCase()}</span>);
  else if (KIND_BADGE[o.kind]) out.push(<span key="k" className={`bullet sq k-${o.kind}`}>{KIND_BADGE[o.kind]}</span>);
  return <span className="bullets" aria-hidden="true">{out}</span>;
}

// What a traveler most needs to know about this row, in priority order:
// a live MTA alert, a warning, the exact-price link, then the top tip.
function GoodToKnow({ o, status, shared, t }) {
  if (status?.items.length) return <span className="alert-text">⚠ {status.items[0].header}</span>;
  const warn = o.warnings.find((w) => w.level === 'warn' && !shared.has(w.text));
  if (warn) return <span className="alert-text">⚠ {warn.text}</span>;
  if (o.deepLinks) {
    return Object.entries(o.deepLinks).map(([k, href]) => (
      <a key={k} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {o.kind === 'rideshare' ? t('exactPriceIn', { app: o.provider }) : t('book')} <ExternalLink size={11} aria-hidden="true" />
      </a>
    ));
  }
  return o.tips?.[0] ?? null;
}

export default function CompareTable({ options, alerts, bestId, t, lang, selectedId, onSelect }) {
  const [open, setOpen] = useState(null);
  // Warnings that apply to many rows (e.g. JFK construction on every car mode)
  // are shown once above the table instead of repeated in each row.
  const counts = {};
  for (const o of options) for (const w of o.warnings) if (w.level === 'warn') counts[w.text] = (counts[w.text] ?? 0) + 1;
  const shared = new Set(Object.keys(counts).filter((k) => counts[k] >= 3));
  return (
    <>
    {[...shared].map((text) => <p key={text} className="shared-warn">⚠ {text}</p>)}
    <table className="cmp">
      <thead>
        <tr>
          <th scope="col">{t('mode')}</th>
          <th scope="col" className="num">{t('cost')}</th>
          <th scope="col" className="num hide-sm">{t('timeCol')}</th>
          <th scope="col" className="num hide-sm">{t('costPerMin')}</th>
          <th scope="col" className="hide-sm">{t('goodToKnow')}</th>
          <th scope="col" className="sr-only">{t('details')}</th>
        </tr>
      </thead>
      <tbody>
        {options.map((o) => {
          const status = o.kind === 'transit' ? statusForLines(o.lines, alerts) : null;
          const isOpen = open === o.id;
          const toggle = () => { setOpen(isOpen ? null : o.id); onSelect?.(o.id); };
          return (
            <Fragment key={o.id}>
              <tr className={`row ${o.id === bestId ? 'best' : ''} ${selectedId === o.id ? 'selected' : ''}`} onClick={toggle}>
                <th scope="row">
                  <button type="button" className="rowbtn" aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); toggle(); }}>
                    <Badges o={o} />
                    <span>
                      <span className="name">
                        {o.name}
                        {status && ['yellow', 'red'].includes(status.color) && <i className={`dot dot-${status.color}`} role="img" aria-label={t(`status${status.color[0].toUpperCase()}${status.color.slice(1)}`)} />}
                      </span>
                      {o.steps?.[0] && <span className="sub" style={{ display: 'block' }}>{o.steps[0]}</span>}
                    </span>
                  </button>
                </th>
                <td className="num">
                  <div className="price">{fmtRange(o.cost)}</div>
                  <span className={`stamp ${o.costKind}`}>{o.costKind === 'verified' ? t('verifiedShort') : t('estimate')}</span>
                  {o.promo && <span className="stamp promo">{t('promoActive')}</span>}
                  <div className="t-sm">{fmtMin(o.time)}<br />${o.costPerMin.toFixed(2)}{t('perMin')}</div>
                </td>
                <td className="num hide-sm">{fmtMin(o.time)}</td>
                <td className="num hide-sm">
                  ${o.costPerMin.toFixed(2)}
                  <div className="sub">${o.costPerMinRange[0].toFixed(2)}–{o.costPerMinRange[1].toFixed(2)}</div>
                </td>
                <td className="hide-sm"><div className="know"><GoodToKnow o={o} status={status} shared={shared} t={t} /></div></td>
                <td className="chev" aria-hidden="true">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
              </tr>
              {isOpen && (
                <tr className="detail-row">
                  <td colSpan={6}>
                    <ResultCard o={o} alerts={alerts} isBestValue={o.id === bestId} t={t} lang={lang} embedded />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
    </>
  );
}
