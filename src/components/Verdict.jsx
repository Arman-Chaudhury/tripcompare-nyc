import { fmtRange } from '../lib/timeValue.js';

const money = (n) => `$${Math.round(n)}`;

// The one-sentence answer: the top-ranked option, plus the trade-off against
// the fastest and the cheapest alternatives, all from the ranked engine output.
export default function Verdict({ options, sort, valueOfTime, useNow, whenLabel, notes, t }) {
  if (!options.length) return <section className="verdict"><p>{t('noOptions')}</p></section>;
  const best = options[0];
  const fastest = options.reduce((a, b) => (b.timeMid < a.timeMid ? b : a));
  const cheapest = options.reduce((a, b) => (b.costMid < a.costMid ? b : a));
  const lines = [];
  if (fastest.id !== best.id && best.timeMid - fastest.timeMid >= 3 && fastest.costMid > best.costMid) {
    lines.push(t('verdictFaster', { name: fastest.name, min: Math.round(best.timeMid - fastest.timeMid), extra: money(fastest.costMid - best.costMid) }));
  }
  if (cheapest.id !== best.id && best.costMid - cheapest.costMid >= 0.5) {
    const longer = Math.round(cheapest.timeMid - best.timeMid);
    lines.push(longer > 2
      ? t('verdictCheaper', { name: cheapest.name, save: `$${(best.costMid - cheapest.costMid).toFixed(2).replace(/\.00$/, '')}`, min: longer })
      : t('verdictCheaperSame', { name: cheapest.name, save: `$${(best.costMid - cheapest.costMid).toFixed(2).replace(/\.00$/, '')}` }));
  }
  const why = best.warnings.find((w) => w.level === 'warn')?.text ?? best.tips?.[0];
  const basis = sort === 'value' ? t('basisValue', { rate: `$${valueOfTime}` }) : sort === 'cheapest' ? t('basisCheapest') : t('basisFastest');

  return (
    <section className="verdict" aria-live="polite">
      <div className="k">{useNow ? t('bestNow') : t('bestAt', { when: whenLabel })} · {basis}</div>
      <h1>{t('verdictHead', { name: best.name, cost: fmtRange(best.cost), min: Math.round(best.timeMid) })}</h1>
      {lines.length > 0 && <p>{lines.join(' ')}</p>}
      {why && <p className="why">{why}</p>}
      {notes.length > 0 && <div className="notes">{notes.map((n, i) => <p key={i}>{n}</p>)}</div>}
    </section>
  );
}
