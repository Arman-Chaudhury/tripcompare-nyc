// Canceled-flight logic: what a passenger is owed, from the US DOT rules and
// the DOT Airline Customer Service Dashboard commitments, plus EU/UK/Canada
// rules where the carrier is foreign. No flight-status feed is used (none is
// free without a backend); the passenger tells us what happened and we apply
// the rules. Everything here is plain data; the tab renders it through t().
//
// Sources (checked 2026-10-16):
//   DOT refund rule (in force since 2024-10-28): automatic cash refund for a
//     cancellation or "significant change" (3h+ domestic, 6h+ international)
//     when the passenger does not accept the rebooking; bag fee refunded when
//     a checked bag is 12h+ late domestic (15–30h international).
//   DOT Airline Customer Service Dashboard: per-airline promises for
//     *controllable* cancellations and delays (crew, maintenance, cleaning…).
//   14 CFR 250.5: involuntary denied boarding, 200% / 400% of the one-way
//     fare, capped at $1,075 / $2,150 (2025 inflation adjustment).
//   DOT final rule 2026-18040 (effective 2026-10-19): ten causes, including
//     some unscheduled maintenance, medical emergencies, unruly passengers,
//     and some airport closures, are no longer reported as airline-controlled,
//     so meal/hotel promises may not apply to them.
//   EU 261/2004 & UK 261: €250/400/600 (UK £220/350/520) for cancellations
//     and 3h+ arrival delays on flights departing the EU/UK, or arriving there
//     on an EU/UK carrier, unless "extraordinary circumstances".
//   Canada APPR: CA$125–1,000 for airline-caused disruptions on Canadian carriers.

export const RIGHTS_LAST_VERIFIED = '2026-10-16';
export const RECLASSIFY_EFFECTIVE = '2026-10-19';
export const BUMP_CAP = { short: 1075, long: 2150 };
export const SIGNIFICANT_DELAY_H = { domestic: 3, intl: 6 };

// Dashboard commitments for controllable disruptions (✓ on transportation.gov).
// rebookSame: rebook on the same airline free · rebookPartner: on a partner
// airline free · meal: meal/voucher for a 3h+ wait · hotel: complimentary
// hotel for an overnight · transport: ride to that hotel · credit: travel
// credit/voucher for a 3h+ wait · miles: frequent-flyer miles.
const ALL = { rebookSame: true, rebookPartner: true, meal: true, hotel: true, transport: true, credit: false, miles: false };
export const AIRLINES = {
  AA: { name: 'American', dashboard: { ...ALL } },
  AS: { name: 'Alaska', dashboard: { ...ALL, credit: true, miles: true } },
  B6: { name: 'JetBlue', dashboard: { ...ALL, credit: true } },
  DL: { name: 'Delta', dashboard: { ...ALL } },
  F9: { name: 'Frontier', dashboard: { ...ALL, rebookPartner: false, hotel: false, transport: false } },
  G4: { name: 'Allegiant', dashboard: { ...ALL, rebookPartner: false } },
  HA: { name: 'Hawaiian', dashboard: { ...ALL } },
  NK: { name: 'Spirit', dashboard: { ...ALL, rebookPartner: false } },
  UA: { name: 'United', dashboard: { ...ALL } },
  WN: { name: 'Southwest', dashboard: { ...ALL, rebookPartner: false } },
  // Foreign carriers common at JFK/EWR: no DOT dashboard, but the US refund
  // rule still applies to any flight to or from the US, and their home rules
  // apply on top.
  AF: { name: 'Air France', region: 'eu' }, KL: { name: 'KLM', region: 'eu' }, LH: { name: 'Lufthansa', region: 'eu' },
  IB: { name: 'Iberia', region: 'eu' }, AZ: { name: 'ITA Airways', region: 'eu' }, TP: { name: 'TAP', region: 'eu' },
  SK: { name: 'SAS', region: 'eu' }, LX: { name: 'SWISS', region: 'eu' }, OS: { name: 'Austrian', region: 'eu' },
  EI: { name: 'Aer Lingus', region: 'eu' }, AY: { name: 'Finnair', region: 'eu' }, LO: { name: 'LOT', region: 'eu' },
  FI: { name: 'Icelandair', region: 'eu' }, BA: { name: 'British Airways', region: 'uk' }, VS: { name: 'Virgin Atlantic', region: 'uk' },
  AC: { name: 'Air Canada', region: 'ca' }, WS: { name: 'WestJet', region: 'ca' },
  EK: { name: 'Emirates' }, QR: { name: 'Qatar Airways' }, TK: { name: 'Turkish Airlines' }, EY: { name: 'Etihad' },
  KE: { name: 'Korean Air' }, JL: { name: 'Japan Airlines' }, NH: { name: 'ANA' }, CX: { name: 'Cathay Pacific' },
  SQ: { name: 'Singapore Airlines' }, AM: { name: 'Aeroméxico' }, AV: { name: 'Avianca' }, CM: { name: 'Copa' },
  LA: { name: 'LATAM' }, LY: { name: 'El Al' }, ET: { name: 'Ethiopian' }, MU: { name: 'China Eastern' }, CA: { name: 'Air China' },
};

/** "DL 123", "dl123", "B6-1234" → { code: 'DL', number: 123, airline } or null. */
export function parseFlight(text) {
  const m = String(text ?? '').trim().toUpperCase().match(/^([A-Z][A-Z0-9]|[0-9][A-Z])[\s-]?(\d{1,4})$/);
  if (!m) return null;
  return { code: m[1], number: +m[2], airline: AIRLINES[m[1]] ?? null };
}

export const EVENTS = ['canceled', 'delayed', 'bumped'];
export const CAUSES = ['airline', 'weather', 'unknown'];
export const DELAY_HOURS = [1, 2, 3, 4, 6, 8, 12];

/** Build the rights card. Returns { items, flags, airline }. Each item is
 *  { key, status: 'yes' | 'maybe' | 'no', vars }, rendered as t(`right_${key}`)
 *  with a one-line reason t(`right_${key}_${status}`). */
export function entitlements({ event, cause, hours = 0, overnight = false, intl = false, airline = null, date = new Date() }) {
  const d = airline?.dashboard ?? null;
  const region = airline?.region ?? null;
  const controllable = cause === 'airline';
  const reclassified = controllable && date >= new Date(`${RECLASSIFY_EFFECTIVE}T00:00:00-04:00`);
  const items = [];
  const push = (key, status, vars = {}) => items.push({ key, status, vars });
  // Dashboard promise → yes; airline unknown → yes for the industry-wide
  // promises (every large US carrier makes them), maybe for the rest.
  const promise = (k, universal) => (d ? (d[k] ? 'yes' : 'no') : universal ? 'yes' : 'maybe');
  const sigH = intl ? SIGNIFICANT_DELAY_H.intl : SIGNIFICANT_DELAY_H.domestic;

  if (event === 'bumped') {
    push('bump', 'yes', { short: `$${BUMP_CAP.short.toLocaleString('en-US')}`, long: `$${BUMP_CAP.long.toLocaleString('en-US')}` });
    push('bumpRefund', 'yes');
    push('rebookSame', 'yes');
    push('meal', hours >= 3 ? promise('meal', true) : 'no', { h: 3 });
    push('hotel', overnight ? promise('hotel', false) : 'no');
  } else {
    const significant = event === 'canceled' || hours >= sigH;
    push('refund', significant ? 'yes' : 'no', { h: sigH });
    push('rebookSame', controllable ? promise('rebookSame', true) : 'maybe');
    push('rebookPartner', controllable ? promise('rebookPartner', false) : 'no');
    push('meal', hours >= 3 && controllable ? promise('meal', true) : hours >= 3 && cause === 'unknown' ? 'maybe' : 'no', { h: 3 });
    push('hotel', overnight && controllable ? promise('hotel', false) : overnight && cause === 'unknown' ? 'maybe' : 'no');
    if (overnight) push('transport', controllable ? promise('transport', false) : 'no');
    if (d?.credit && controllable && hours >= 3) push('credit', 'yes');
    if (d?.miles && controllable && hours >= 3) push('miles', 'yes');
    push('cashUS', 'no');
  }
  push('bagFee', 'maybe', { h: intl ? '15–30' : '12' });
  push('ancillary', 'yes');
  if (region === 'eu' || region === 'uk') push('eu261', cause === 'weather' ? 'no' : controllable ? 'yes' : 'maybe', { amt: region === 'uk' ? '£220–520' : '€250–600' });
  if (region === 'ca') push('appr', cause === 'weather' ? 'no' : controllable ? 'yes' : 'maybe');

  const flags = [];
  if (reclassified) flags.push('reclassified');
  if (cause === 'unknown') flags.push('askCause');
  if (cause === 'weather') flags.push('weatherInsurance');
  if (!airline) flags.push('airlineUnknown');
  if (airline && !d && !region) flags.push('foreignNoDashboard');
  return { items, flags, airline };
}

/** Google Flights search for alternatives out of an airport. Natural-language
 *  `q` is the only stable public URL form. */
export function flightsLink({ from, to = '', date = '' }) {
  const parts = [`Flights from ${from}`];
  if (to) parts.push(`to ${to.toUpperCase()}`);
  if (date) parts.push(`on ${date}`);
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(parts.join(' '))}`;
}
export const hotelsLink = (airportName) => `https://www.google.com/travel/hotels?q=${encodeURIComponent(`hotels near ${airportName} airport`)}`;
export const mapsLink = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

/** The ISO date (New York) for `date`, for flight/hotel search links. */
export function nyDate(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
