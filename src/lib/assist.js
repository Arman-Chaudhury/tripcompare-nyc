// "Help a passenger": the question a traveler asks at the desk, turned into a
// filter + sort over the same engine output that Getting there shows.
//
// A need is one of NEEDS. Two of them (cheapest, fastest) are just a sort; the
// other three change the option list: bikes drop out for luggage and mobility,
// and a group multiplies per-seat fares by the party and per-car fares by the
// number of cabs the party needs. The URL carries `sort`, `need`, and `party`
// so the QR handout reproduces exactly what the staff member saw.

export const NEEDS = ['cheapest', 'fastest', 'luggage', 'group', 'mobility'];
export const FILTER_NEEDS = ['luggage', 'group', 'mobility'];
export const MIN_PARTY = 2;
export const MAX_PARTY = 8;

// Yellow cabs, UberX / Lyft, and car services carry 4 passengers; everything
// else is priced per seat (UberXL / Lyft XL seat 6 but are not modeled).
export const SEATS_PER_CAR = 4;
const PER_CAR_KINDS = new Set(['taxi', 'rideshare', 'carservice']);

export const carsForParty = (party) => Math.max(1, Math.ceil(party / SEATS_PER_CAR));

export function normalizeParty(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return MIN_PARTY;
  return Math.min(MAX_PARTY, Math.max(MIN_PARTY, n));
}

/** URL params for a need: `sort` for the ranking, `need`/`party` for filters. */
export function needToQuery(need, party = MIN_PARTY) {
  if (need === 'cheapest' || need === 'fastest') return { sort: need };
  if (need === 'group') return { sort: 'value', need, party: String(normalizeParty(party)) };
  if (FILTER_NEEDS.includes(need)) return { sort: 'value', need };
  return { sort: 'value' };
}

/** Read `need` / `party` back out of URL params; unknown values are ignored. */
export function needFromQuery(params) {
  const need = FILTER_NEEDS.includes(params.need) ? params.need : null;
  return { need, party: need === 'group' ? normalizeParty(params.party) : MIN_PARTY };
}

function scaleCost(o, k, label) {
  if (k === 1) return o;
  const cost = o.cost.map((c) => +(c * k).toFixed(2));
  const costMid = (cost[0] + cost[1]) / 2;
  return {
    ...o,
    cost,
    costMid,
    costPerMin: costMid / o.timeMid,
    costPerMile: costMid / o.miles,
    costPerMinRange: [cost[0] / o.time[1], cost[1] / o.time[0]],
    costPerMileRange: [cost[0] / o.miles, cost[1] / o.miles],
    breakdown: [...o.breakdown, { label, amount: null, range: [k, k], x: true }],
    partyFactor: k,
  };
}

/**
 * Apply a filtering need to engine options. Returns the (possibly rescaled)
 * options and the note keys + vars the UI should render above the table.
 * Options must already carry costMid / timeMid / miles (buildOptions output).
 */
export function applyNeed(options, { need, party = MIN_PARTY } = {}) {
  if (!FILTER_NEEDS.includes(need)) return { options, notes: [] };
  if (need === 'luggage') {
    return { options: options.filter((o) => o.kind !== 'bike'), notes: [{ key: 'needNoteLuggage' }] };
  }
  if (need === 'mobility') {
    return { options: options.filter((o) => o.kind !== 'bike'), notes: [{ key: 'needNoteMobility' }] };
  }
  const n = normalizeParty(party);
  const cars = carsForParty(n);
  const scaled = options
    .filter((o) => o.kind !== 'bike') // one e-bike per person is not a group plan
    .map((o) => (PER_CAR_KINDS.has(o.kind) ? scaleCost(o, cars, `× ${cars} car${cars > 1 ? 's' : ''} for ${n} people`) : scaleCost(o, n, `× ${n} people`)));
  return { options: scaled, notes: [{ key: cars > 1 ? 'needNoteGroupCars' : 'needNoteGroupOneCar', vars: { n, cars } }] };
}
