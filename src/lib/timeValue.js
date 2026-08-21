// The time-value metric: what are you paying per hour saved (vs. the
// cheapest option), or earning per hour spent (vs. the fastest option)?

export const DEFAULT_VALUE_OF_TIME = 25; // $/hr used for the "best value" sort

export function annotateTimeValue(options, valueOfTime = DEFAULT_VALUE_OF_TIME) {
  if (!options.length) return [];
  const cheapest = options.reduce((a, b) => (b.costMid < a.costMid ? b : a));
  const fastest = options.reduce((a, b) => (b.timeMid < a.timeMid ? b : a));

  return options.map((o) => {
    const extraCost = o.costMid - cheapest.costMid;
    const minSaved = cheapest.timeMid - o.timeMid;
    const savings = fastest.costMid - o.costMid;
    const extraMin = o.timeMid - fastest.timeMid;

    const tv = {
      isCheapest: o.id === cheapest.id,
      isFastest: o.id === fastest.id,
      vsCheapest: null,
      vsFastest: null,
      generalizedCost: o.costMid + (o.timeMid / 60) * valueOfTime,
    };
    if (!tv.isCheapest && extraCost > 0 && minSaved > 0) {
      tv.vsCheapest = { extraCost, minSaved, perHour: extraCost / (minSaved / 60) };
    } else if (!tv.isCheapest && extraCost > 0 && minSaved <= 0) {
      tv.vsCheapest = { extraCost, minSaved, perHour: Infinity }; // costs more AND slower
    }
    if (!tv.isFastest && savings > 0 && extraMin > 0) {
      tv.vsFastest = { savings, extraMin, perHour: savings / (extraMin / 60) };
    }
    return { ...o, tv };
  });
}

export function sortOptions(options, mode) {
  const arr = [...options];
  if (mode === 'cheapest') arr.sort((a, b) => a.costMid - b.costMid || a.timeMid - b.timeMid);
  else if (mode === 'fastest') arr.sort((a, b) => a.timeMid - b.timeMid || a.costMid - b.costMid);
  else arr.sort((a, b) => a.tv.generalizedCost - b.tv.generalizedCost);
  return arr;
}

export function commuterProjection(costMid) {
  // One-way trips: 5 round trips per week.
  const weekly = costMid * 10;
  return { weekly, monthly: weekly * 4.33, yearly: weekly * 52 };
}

export const fmtMoney = (n) => (n === 0 ? 'FREE' : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);
export const fmtRange = ([a, b]) => (a === b ? fmtMoney(a) : `$${Math.round(a)}–${Math.round(b)}`);
export const fmtMin = ([a, b]) => (a === b ? `${a} min` : `${a}–${b} min`);
