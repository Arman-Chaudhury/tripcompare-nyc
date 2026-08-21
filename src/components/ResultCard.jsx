import { useState } from 'react';
import { Train, Car, Bus, Bike, Smartphone, CarFront, Plane, ChevronDown, ChevronUp, AlertTriangle, Info, ExternalLink, Sparkles, Leaf, Flame } from 'lucide-react';
import { statusForLines } from '../lib/alerts.js';
import { commuterProjection, fmtMoney, fmtRange, fmtMin } from '../lib/timeValue.js';
import StatusDot from './StatusDot.jsx';

const ICONS = { transit: Train, taxi: Car, rideshare: Smartphone, shuttle: Bus, bike: Bike, carservice: CarFront, air: Plane };

function TimeValue({ o, t }) {
  const { tv } = o;
  if (tv.isCheapest && tv.isFastest) return null;
  const rate = (n) => (Number.isFinite(n) ? `$${Math.round(n)}` : '∞');
  return (
    <div className="tv">
      {tv.vsCheapest && (
        <p className={`tv-line ${Number.isFinite(tv.vsCheapest.perHour) ? 'tv-pay' : 'tv-bad'}`}>
          {Number.isFinite(tv.vsCheapest.perHour)
            ? t('paysPerHour', { extra: `$${Math.round(tv.vsCheapest.extraCost)}`, min: Math.round(tv.vsCheapest.minSaved), rate: rate(tv.vsCheapest.perHour) })
            : t('paysButSlower', { extra: `$${Math.round(tv.vsCheapest.extraCost)}` })}
        </p>
      )}
      {tv.vsFastest && (
        <p className="tv-line tv-earn">
          {t('earnsPerHour', { savings: `$${Math.round(tv.vsFastest.savings)}`, min: Math.round(tv.vsFastest.extraMin), rate: rate(tv.vsFastest.perHour) })}
        </p>
      )}
    </div>
  );
}

export default function ResultCard({ o, alerts, isBestValue, t, lang, embedded = false, onSelect }) {
  const [open, setOpen] = useState(embedded);
  const Icon = ICONS[o.kind] ?? Train;
  const status = o.kind === 'transit' ? statusForLines(o.lines, alerts) : null;
  const statusLabel = status ? t(`status${status.color[0].toUpperCase()}${status.color.slice(1)}`) : '';
  const proj = commuterProjection(o.costMid);
  const money = (n) => `$${Math.round(n).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}`;
  const promoEnd = o.promo ? new Date(o.promo.end).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' }) : null;

  return (
    <article className={`card kind-${o.kind} ${embedded ? 'embedded' : ''}`}>
      {!embedded && <button type="button" className="card-head" aria-expanded={open} onClick={() => { setOpen((v) => !v); onSelect?.(); }}>
        <div className="card-icon" aria-hidden="true">
          <Icon size={22} />
        </div>
        <div className="card-main">
          <div className="card-title-row">
            <h3 className="card-title">{o.name}</h3>
            {status && status.color !== 'none' && <StatusDot color={status.color} label={statusLabel} />}
          </div>
          <div className="badges">
            {o.tv.isCheapest && <span className="badge b-cheap">{t('cheapestBadge')}</span>}
            {o.tv.isFastest && <span className="badge b-fast">{t('fastestBadge')}</span>}
            {isBestValue && <span className="badge b-value">{t('bestValueBadge')}</span>}
            {o.promo && (
              <span className="badge b-promo">
                <Sparkles size={12} aria-hidden="true" /> {t('promoActive')}
              </span>
            )}
          </div>
          {o.lines.length > 0 && (
            <div className="lines" aria-label="lines">
              {o.lines.map((l) => (
                <span key={l} className={`bullet line-${l}`}>
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="card-nums">
          <div className="cost">{fmtRange(o.cost)}</div>
          <div className={`kind-tag ${o.costKind}`}>
            {o.costKind === 'verified' ? t('verifiedFare') : o.kind === 'rideshare' ? `${t('estimate')} — ${t('liveQuote')}` : t('estimate')}
          </div>
          <div className="time">{fmtMin(o.time)}</div>
          <div className="cpm">${o.costPerMile.toFixed(2)}{t('perMi')} · ${o.costPerMin.toFixed(2)}{t('perMin')}</div>
        </div>
        <span className="chev" aria-hidden="true">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>}

      <TimeValue o={o} t={t} />

      {o.warnings.filter((w) => w.level === 'warn').map((w, i) => (
        <p key={i} className="warn">
          <AlertTriangle size={14} aria-hidden="true" /> {w.text}
        </p>
      ))}

      {status && status.items.length > 0 && (
        <div className="alerts">
          {status.items.slice(0, 3).map((a) => (
            <p key={a.id} className={`alert alert-${a.severity}`}>
              <span className="kind-tag live">{t('liveAlert')}</span> <strong>{a.line}</strong> {a.header}
            </p>
          ))}
        </div>
      )}

      {o.deepLinks && (
        <div className="deeplinks">
          {Object.entries(o.deepLinks).map(([k, href]) => (
            <a key={k} className="btn btn-uber" href={href} target="_blank" rel="noopener noreferrer">
              {o.kind === 'rideshare' ? t('exactPriceIn', { app: o.provider }) : t('bookWith', { name: o.name })} <ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}

      {open && (
        <div className="card-body">
          {o.kind === 'rideshare' && <p className="muted">{t('deepLinkNote')} {t(`surge${o.surgeLabel[0].toUpperCase()}${o.surgeLabel.slice(1)}`)}.</p>}
          <p className="rate-line"><strong>{t('rateLine', { mi: o.miles, perMile: `$${o.costPerMile.toFixed(2)}`, perMin: `$${o.costPerMin.toFixed(2)}` })}</strong></p>
          {o.promo && (
            <p className="promo-detail">
              <Sparkles size={14} aria-hidden="true" /> {o.promo.label}: {t('promoUntil', { date: promoEnd, full: fmtMoney(o.promo.fullAmount) })}
            </p>
          )}
          {o.steps && (
            <>
              <h4>{t('howTo')}{o.reversed ? ' (reverse direction)' : ''}</h4>
              <ol className="steps">
                {o.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}
          <h4>{t('costBreakdown')}</h4>
          <ul className="breakdown">
            {o.breakdown.map((b, i) => (
              <li key={i}>
                <span>
                  {b.label}
                  {b.approximate ? ' *' : ''}
                </span>
                <span>
                  {b.struck != null && <s className="muted">{fmtMoney(b.struck)} </s>}
                  {b.amount != null ? fmtMoney(b.amount) : b.range ? (b.x ? `×${b.range[0].toFixed(2)}–${b.range[1].toFixed(2)}` : fmtRange(b.range)) : ''}
                </span>
              </li>
            ))}
          </ul>
          {o.breakdown.some((b) => b.approximate) && <p className="muted small">* approximate — verify in the operator's app</p>}
          {o.warnings.filter((w) => w.level === 'info').map((w, i) => (
            <p key={i} className="info">
              <Info size={14} aria-hidden="true" /> {w.text}
            </p>
          ))}
          <h4>{t('tips')}</h4>
          <ul className="tips">
            {o.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
          <h4>{t('commuter')}</h4>
          <div className="proj">
            <div>
              <span className="muted">{t('weekly')}</span>
              <strong>{money(proj.weekly)}</strong>
            </div>
            <div>
              <span className="muted">{t('monthly')}</span>
              <strong>{money(proj.monthly)}</strong>
            </div>
            <div>
              <span className="muted">{t('yearly')}</span>
              <strong>{money(proj.yearly)}</strong>
            </div>
          </div>
          <div className="eco">
            <span>
              <Leaf size={14} aria-hidden="true" /> {t('co2')}: {o.co2} kg
            </span>
            {o.calories && (
              <span>
                <Flame size={14} aria-hidden="true" /> {t('calories')}: {o.calories[0]}–{o.calories[1]} kcal
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
