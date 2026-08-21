// Builds the list of comparable options for one (origin → destination, time).
// Every option carries:
//   cost: [lo, hi]        dollars, always a range (lo === hi for verified flat fares)
//   costKind: 'verified' | 'estimate'
//   time: [lo, hi]        minutes, always a range
//   kind: 'transit' | 'taxi' | 'rideshare' | 'shuttle' | 'bike'
//
// Origin/destination are "places" (see lib/geo.js). Transit itineraries are
// curated per airport ↔ neighborhood; custom addresses snap to the nearest
// neighborhood (with a last-mile adjustment) and road modes are computed from
// geometry. Trips that involve no airport get road modes only.

import { fares, getFare, promoActive } from '../data/fares.js';
import { airports, destinationById, STATIONS } from '../data/destinations.js';
import { trafficProfile, driveRange, isLirrPeak, surgeProfile } from './traffic.js';
import { estimateRoad, nearest, presetPlaces, airportPlaces, haversineMiles } from './geo.js';

const CO2_KG_PER_MILE = { car: 0.4, shuttle: 0.12, transit: 0.08, bike: 0 };
const r = (n) => Math.round(n);
const mid = ([a, b]) => (a + b) / 2;
const SNAP_AIRPORT_MI = 2.5;
const SNAP_PRESET_MI = 2.5;

// ─── Trip resolution ────────────────────────────────────────────────────────
export function resolveTrip(origin, destination, roadOverride = null) {
  const notes = [];
  let airport = null, direction = 'from', other = destination;
  if (origin.kind === 'airport') { airport = origin.id; other = destination; direction = 'from'; }
  else if (destination.kind === 'airport') { airport = destination.id; other = origin; direction = 'to'; }
  else {
    const nO = nearest(origin, airportPlaces()), nD = nearest(destination, airportPlaces());
    if (nO.miles <= SNAP_AIRPORT_MI) { airport = nO.place.id; other = destination; direction = 'from'; notes.push(`Origin treated as ${airport} (${nO.miles.toFixed(1)} mi away).`); }
    else if (nD.miles <= SNAP_AIRPORT_MI) { airport = nD.place.id; other = origin; direction = 'to'; notes.push(`Destination treated as ${airport} (${nD.miles.toFixed(1)} mi away).`); }
  }

  let dest = null, lastMileMi = 0, transitOk = false;
  if (other.kind === 'preset') { dest = destinationById[other.id]; transitOk = true; }
  else if (other.kind === 'custom' || other.kind === 'airport') {
    const n = nearest(other, presetPlaces());
    dest = destinationById[n.place.id];
    lastMileMi = n.miles;
    transitOk = airport != null && n.miles <= SNAP_PRESET_MI;
    if (airport && transitOk) notes.push(`Transit itineraries use ${dest.name} routes plus ~${n.miles.toFixed(1)} mi at the far end.`);
    else if (airport) notes.push(`${other.name} is ${n.miles.toFixed(1)} mi from the nearest curated neighborhood (${dest.name}); showing car options only.`);
  }
  if (!airport) notes.push('Transit itineraries are curated for airport trips; for other trips only car options are shown.');

  // Road geometry
  let miles, freeFlowMin;
  if (roadOverride) { miles = +roadOverride.miles.toFixed(1); freeFlowMin = Math.round(roadOverride.freeFlowMin); }
  else if (airport && other.kind === 'preset') { miles = dest.miles[airport]; freeFlowMin = dest.drive[airport]; }
  else { ({ miles, freeFlowMin } = estimateRoad(origin, destination)); }

  const inManhattan = dest?.borough === 'Manhattan' && (other.kind === 'preset' || lastMileMi <= SNAP_PRESET_MI);
  return {
    airport, direction, other, dest, lastMileMi, transitOk, miles, freeFlowMin, notes,
    borough: other.kind === 'preset' || lastMileMi <= SNAP_PRESET_MI ? dest.borough : 'Other',
    southOf96: inManhattan && dest.southOf96,
    crz: inManhattan && dest.crz,
    straightMiles: haversineMiles(origin, destination),
  };
}

function tollRange(trip) {
  const { airport, borough } = trip;
  if (airport === 'EWR') return borough === 'New Jersey' ? [0, 0] : [14, 18]; // Hudson crossings
  if (borough === 'Manhattan') return [0, 11]; // toll-free bridges, or Queens-Midtown/Hugh Carey tunnel
  if (borough === 'New Jersey') return [0, 7];
  return [0, 0];
}
const tipRange = (b) => [b[0] * 1.15, b[1] * 1.22];

// ─── Taxi ───────────────────────────────────────────────────────────────────
function taxiOption(trip, profile) {
  const { airport, direction, miles, freeFlowMin } = trip;
  const drive = driveRange(freeFlowMin, profile, 5, 15); // + curb wait
  const tolls = tollRange(trip);
  const breakdown = [], tips = [];
  let base, verifiedBase = false;

  if (airport === 'JFK' && trip.borough === 'Manhattan') {
    verifiedBase = true;
    base = getFare('taxi_jfk_manhattan_flat');
    breakdown.push({ label: 'JFK ↔ Manhattan flat fare', amount: base });
    if (profile.isPmRush) { const s = getFare('taxi_rush_surcharge_jfk'); base += s; breakdown.push({ label: 'Rush-hour surcharge (wkdy 4–8pm)', amount: s }); }
    tips.push('The $70 flat fare applies to yellow cabs between JFK and anywhere in Manhattan, either direction. Other boroughs are metered.');
    tips.push('The Curb app books the same yellow cabs at the same rate — handy if the taxi line is long.');
    tips.push('Ask for the flat fare if the meter is running; you can also request the Van Wyck route to avoid tunnel tolls.');
  } else if (airport === 'EWR' && direction === 'from') {
    // TODO: verify current EWR zone fares at the taxi stand / panynj.gov before launch.
    const zone = trip.borough === 'New Jersey' ? [45, 60] : trip.borough === 'Manhattan' ? [75, 95] : [95, 130];
    const cost = tipRange([zone[0] + tolls[0], zone[1] + tolls[1]]).map(r);
    breakdown.push({ label: 'NJ taxi zone fare (est.)', amount: null, range: zone });
    if (tolls[1]) breakdown.push({ label: 'Tolls', amount: null, range: tolls });
    breakdown.push({ label: 'Tip (15–22%)', amount: null, pct: true });
    tips.push('Newark taxis charge a posted zone fare, not a meter. Confirm the fare with the dispatcher at the stand before getting in.');
    return finishRoad({ id: 'taxi', kind: 'taxi', name: 'Taxi (NJ cab)', cost, costKind: 'estimate', time: drive, breakdown, tips, warnings: [] }, trip);
  } else {
    const distance = getFare('taxi_meter_initial') + getFare('taxi_meter_unit') * miles * 5;
    breakdown.push({ label: `Meter: $3.00 + $0.70 × ⅕ mi (${miles} mi)`, amount: +distance.toFixed(2) });
    const slow = [Math.max(0, drive[0] - freeFlowMin), Math.max(0, drive[1] - freeFlowMin)].map((m) => m * getFare('taxi_meter_unit'));
    if (slow[1] > 0) breakdown.push({ label: 'Stop-and-go time ($0.70/min)', amount: null, range: slow.map(r) });
    base = [distance + slow[0], distance + slow[1]];
    if (airport === 'LGA') { const s = getFare('taxi_lga_surcharge'); base = base.map((b) => b + s); breakdown.push({ label: 'LGA surcharge', amount: s }); }
    if (airport === 'EWR' && direction === 'to') { const s = getFare('taxi_ewr_surcharge'); base = base.map((b) => b + s); breakdown.push({ label: 'Newark surcharge (NYC cab to EWR)', amount: s }); }
    if (profile.isPmRush) { const s = getFare('taxi_meter_rush'); base = base.map((b) => b + s); breakdown.push({ label: 'Rush-hour surcharge', amount: s }); }
    else if (profile.isNight) { const s = getFare('taxi_meter_night'); base = base.map((b) => b + s); breakdown.push({ label: 'Nighttime surcharge (8pm–6am)', amount: s }); }
    tips.push(airport ? 'Use the official taxi stand, or book a yellow cab in the Curb app at the same meter rate.' : 'Hail a yellow cab or use the Curb app (same meter rates).');
    tips.push('Metered fares are estimates from distance + traffic; the meter is the final word.');
  }

  if (!Array.isArray(base)) base = [base, base];
  const fixed = getFare('taxi_mta_tax') + getFare('taxi_improvement_surcharge');
  breakdown.push({ label: 'MTA + improvement surcharges', amount: fixed });
  base = base.map((b) => b + fixed);
  if (trip.southOf96) { const s = getFare('taxi_state_congestion'); base = base.map((b) => b + s); breakdown.push({ label: 'NYS congestion surcharge (south of 96th)', amount: s }); }
  if (trip.crz) { base = base.map((b) => b + 0.75); breakdown.push({ label: 'Congestion Relief Zone toll (south of 60th)', amount: 0.75 }); }
  if (tolls[1] > 0) breakdown.push({ label: 'Tolls (route-dependent)', amount: null, range: tolls });
  breakdown.push({ label: 'Tip (15–22%)', amount: null, pct: true });
  const cost = tipRange([base[0] + tolls[0], base[1] + tolls[1]]).map(r);
  return finishRoad({ id: 'taxi', kind: 'taxi', name: 'Yellow taxi', cost, costKind: 'estimate', verifiedBase, time: drive, breakdown, tips, warnings: [] }, trip);
}

function finishRoad(o, trip) {
  const warnings = [...o.warnings];
  if (trip.airport === 'JFK') warnings.push({ level: 'warn', text: airports.JFK.constructionWarning });
  return { ...o, warnings, lines: [], co2: +(CO2_KG_PER_MILE.car * trip.miles).toFixed(1), roadExposed: true };
}

// ─── Rideshare (Uber / Lyft / Revel) ────────────────────────────────────────
// No public price API exists for any of these. We show an estimate range by
// route + time of day and deep-link into each app for the exact live quote.
const PROVIDERS = [
  { id: 'uber', name: 'UberX', link: (o, d) => `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${o.lat}&pickup[longitude]=${o.lng}&pickup[nickname]=${encodeURIComponent(o.name)}&dropoff[latitude]=${d.lat}&dropoff[longitude]=${d.lng}&dropoff[nickname]=${encodeURIComponent(d.name)}`, app: 'Uber', factor: [1, 1] },
  { id: 'lyft', name: 'Lyft', link: (o, d) => `https://lyft.com/ride?id=lyft&pickup[latitude]=${o.lat}&pickup[longitude]=${o.lng}&destination[latitude]=${d.lat}&destination[longitude]=${d.lng}`, app: 'Lyft', factor: [0.95, 1.02] },
  { id: 'revel', name: 'Revel (electric)', link: () => 'https://gorevel.com/rideshare', app: 'Revel', factor: [0.95, 1.05], nycOnly: true },
];

function rideshareOptions(trip, profile, weather, origin, destination) {
  const { airport, miles, freeFlowMin } = trip;
  const drive = driveRange(freeFlowMin, profile, 8, 20); // + walk to lot & driver ETA
  const surge = surgeProfile(profile, weather);
  let lo = 12 + 2.2 * miles + 0.35 * drive[0];
  let hi = 18 + 3.2 * miles + 0.55 * drive[1];
  if (airport === 'JFK' && trip.borough === 'Manhattan') [lo, hi] = fares.rideshare_jfk_manhattan.range;
  const warnings = [];
  if (airport === 'JFK') warnings.push({ level: 'warn', text: airports.JFK.constructionWarning });
  if (airport && trip.direction === 'from') warnings.push({ level: 'info', text: airports[airport].rideshareNote });
  return PROVIDERS.filter((p) => !(p.nycOnly && trip.borough === 'New Jersey')).map((p) => ({
    id: p.id, kind: 'rideshare', name: p.name, provider: p.app,
    cost: [r(lo * surge.lo * p.factor[0]), r(hi * surge.hi * p.factor[1])], costKind: 'estimate', surgeLabel: surge.label, time: drive, lines: [], warnings,
    tips: [
      `The exact ${p.app} fare is only available inside the ${p.app} app — tap "Open in ${p.app}" and the trip is pre-filled so you see the real upfront price.`,
      'Surge pricing at rush hour, in rain, or after flight banks can push the fare above the $70 taxi flat rate (JFK ↔ Manhattan).',
      'Compare against the taxi line: at busy times the taxi stand is often faster than waiting for a driver.',
    ],
    deepLinks: { [p.id]: p.link(origin, destination) },
    breakdown: [{ label: 'Base estimate by distance & time', amount: null, range: [r(lo * p.factor[0]), r(hi * p.factor[1])] }, { label: `Demand multiplier (${surge.label})`, amount: null, range: [surge.lo, surge.hi], x: true }],
    co2: +((p.id === 'revel' ? 0.05 : CO2_KG_PER_MILE.car) * miles).toFixed(1), roadExposed: true,
  }));
}

// ─── Car services with published flat rates (Carmel, Dial 7) ────────────────
function carServiceOptions(trip, profile) {
  const { airport, borough, miles, freeFlowMin } = trip;
  if (!airport) return [];
  const drive = driveRange(freeFlowMin, profile, 10, 20); // pre-booked; meets at terminal
  const tolls = tollRange(trip);
  const list = [
    { id: 'carmel', name: 'Carmel car service', key: 'carmel_jfk_manhattan', url: 'https://www.carmellimo.com/' },
    { id: 'dial7', name: 'Dial 7 car service', key: 'dial7_jfk_manhattan', url: 'https://www.dial7.com/' },
  ];
  return list.map((c) => {
    const f = fares[c.key];
    // Published flat rates are for JFK ↔ Manhattan; other pairings scale by distance (estimate).
    const scale = airport === 'JFK' && borough === 'Manhattan' ? 1 : Math.max(0.6, miles / 16);
    const flat = +(f.amount * scale).toFixed(0);
    const pre = [flat + tolls[0], flat + tolls[1]];
    const cost = [r(pre[0] * 1.15), r(pre[1] * 1.2)];
    return {
      id: c.id, kind: 'carservice', name: c.name, cost, costKind: 'estimate', time: drive, lines: [],
      warnings: airport === 'JFK' ? [{ level: 'warn', text: airports.JFK.constructionWarning }] : [],
      tips: [f.note, scale === 1 ? 'Flat rate is quoted up front when you book — no surge.' : 'Flat rate shown is scaled from the published JFK ↔ Manhattan rate; get the exact quote when booking.', 'Driver meets you at baggage claim (meet-and-greet may cost extra).'],
      deepLinks: { [c.id]: c.url },
      breakdown: [{ label: scale === 1 ? 'Published flat rate' : 'Flat rate (scaled by distance)', amount: flat, approximate: true }, ...(tolls[1] ? [{ label: 'Tolls', amount: null, range: tolls }] : []), { label: 'Tip (15–20%)', amount: null, pct: true }],
      co2: +(CO2_KG_PER_MILE.car * miles).toFixed(1), roadExposed: true, fareKeys: [c.key],
    };
  });
}

// ─── Blade helicopter (JFK ↔ Manhattan) ─────────────────────────────────────
function bladeOption(trip, profile) {
  if (trip.airport !== 'JFK' || trip.borough !== 'Manhattan') return null;
  const f = fares.blade_jfk;
  const ground = driveRange(12, profile, 10, 20); // heliport ↔ final address by car
  return {
    id: 'blade', kind: 'air', name: 'Blade helicopter', cost: [f.amount + 15, f.amount + 45], costKind: 'estimate', time: [35 + ground[0], 55 + ground[1]], lines: [],
    warnings: [{ level: 'info', text: 'Flights are scheduled; arrive at the Blade lounge 20 min before. Weather cancellations are rebooked or refunded.' }],
    tips: [f.note, 'Price shown = seat + a short taxi from the heliport to your address.', 'Luggage limit applies (one checked bag + carry-on).'],
    deepLinks: { blade: 'https://www.blade.com/airport' },
    breakdown: [{ label: 'Blade seat (published)', amount: f.amount, approximate: true }, { label: 'Ground transfer from heliport', amount: null, range: [15, 45] }],
    co2: +(trip.miles * 1.2).toFixed(1), roadExposed: false, fareKeys: ['blade_jfk'],
  };
}

// ─── Go Airlink shared van ───────────────────────────────────────────────────
function goAirlinkOption(trip, profile) {
  if (!trip.airport || trip.borough !== 'Manhattan') return null;
  const f = fares.goairlink_shared;
  const drive = driveRange(trip.freeFlowMin, profile, 20, 45);
  return {
    id: 'goairlink', kind: 'shuttle', name: 'Go Airlink shared van', cost: [f.amount, f.amount + 5], costKind: 'estimate', time: drive, lines: [],
    warnings: trip.airport === 'JFK' ? [{ level: 'warn', text: airports.JFK.constructionWarning }] : [],
    tips: [f.note, 'Door-to-door, unlike the Uber shuttle, but slower because of other drop-offs.'],
    deepLinks: { goairlink: 'https://www.goairlinkshuttle.com/' },
    breakdown: [{ label: 'Shared-ride seat (published)', amount: f.amount, approximate: true }, { label: 'Tip', amount: null, range: [0, 5] }],
    co2: +(CO2_KG_PER_MILE.shuttle * trip.miles).toFixed(1), roadExposed: true, fareKeys: ['goairlink_shared'],
  };
}

// ─── Uber Airport Shuttle ────────────────────────────────────────────────────
function shuttleOption(trip, profile) {
  const { airport, dest, direction, other } = trip;
  if (!airport || !dest?.uberShuttle?.[airport] || other.kind !== 'preset' || direction !== 'from') return null;
  const key = airport === 'JFK' ? 'uber_shuttle_jfk' : 'uber_shuttle_lga';
  const f = fares[key];
  const drive = driveRange(trip.freeFlowMin, profile, 15, 35);
  const warnings = airport === 'JFK' ? [{ level: 'warn', text: airports.JFK.constructionWarning }] : [];
  return {
    id: 'shuttle', kind: 'shuttle', name: 'Uber Airport Shuttle', cost: [f.amount, f.amount], costKind: 'verified', time: drive, lines: [], warnings,
    tips: [f.note, 'Drops only at the fixed stops — budget a short subway ride or walk from the stop to your door.', 'Great value for 1–2 people with luggage; a group of 3+ may do better splitting a taxi.'],
    breakdown: [{ label: 'Flat fare per seat', amount: f.amount }],
    co2: +(CO2_KG_PER_MILE.shuttle * trip.miles).toFixed(1), roadExposed: true, fareKeys: [key],
  };
}

// ─── Transit ────────────────────────────────────────────────────────────────
function transitOptions(trip, profile, date) {
  const { airport, dest, direction, transitOk, lastMileMi } = trip;
  if (!airport || !transitOk) return [];
  const routes = dest.transit?.[airport] ?? [];
  const peak = isLirrPeak(date, direction === 'to' ? 0 : 45);
  const extra = lastMileMi > 0.3 ? [r(lastMileMi * 12), r(lastMileMi * 22)] : [0, 0]; // walk / local bus at the far end
  return routes.map((route) => {
    const breakdown = [], fareKeys = [];
    let cost = 0, promo = null;
    for (const leg of route.legs) {
      const key = leg === 'lirr_cityticket' ? (peak ? 'lirr_cityticket_peak' : 'lirr_cityticket_offpeak') : leg;
      const f = fares[key];
      const amt = getFare(key, date);
      fareKeys.push(key); cost += amt;
      breakdown.push({ label: f.label, amount: amt, approximate: f.approximate, struck: promoActive(f, date) ? f.amount : null });
      if (promoActive(f, date)) promo = { ...f.promo, fullAmount: f.amount };
    }
    const warnings = [];
    if (route.warningKey && fares[route.warningKey].warning) warnings.push({ level: 'warn', text: fares[route.warningKey].warning });
    if (profile.isOvernight && route.lines.some((l) => ['E', 'J', 'A'].includes(l))) warnings.push({ level: 'info', text: 'Overnight (midnight–5am): E and J run local and less often; the A to Howard Beach runs every 15–20 min. Add 10–20 min.' });
    if (profile.isOvernight && route.lines.includes('LIRR')) warnings.push({ level: 'info', text: 'Overnight LIRR trains are roughly hourly — check TrainTime before committing.' });
    if (route.lines.includes('LIRR')) warnings.push({ level: 'info', text: peak ? 'Peak CityTicket pricing applies at this time ($7.25).' : 'Off-peak CityTicket pricing applies at this time ($5.25).' });
    if (extra[1]) warnings.push({ level: 'info', text: `Adds ${extra[0]}–${extra[1]} min for the last ${lastMileMi.toFixed(1)} mi from ${dest.name} (walk or local bus).` });
    let time = [route.time[0] + extra[0], route.time[1] + extra[1]];
    if (route.roadExposed) time = [time[0], r(time[1] + 15 * (profile.hi - 1))];
    const approximate = breakdown.some((b) => b.approximate);
    const legTips = route.legs.map((l) => fares[l === 'lirr_cityticket' ? 'lirr_cityticket_offpeak' : l].note).filter(Boolean);
    const steps = direction === 'to' ? [...(route.steps ?? [])].reverse() : route.steps;
    return {
      id: route.id, kind: 'transit', name: route.name, cost: [+cost.toFixed(2), +cost.toFixed(2)], costKind: approximate ? 'estimate' : 'verified',
      time, lines: route.lines, steps, reversed: direction === 'to', via: (route.via ?? []).map((k) => STATIONS[k]).filter(Boolean), tips: [...(route.tips ?? []), ...legTips], warnings, breakdown, promo, fareKeys,
      co2: +(CO2_KG_PER_MILE.transit * trip.miles).toFixed(1), roadExposed: !!route.roadExposed,
    };
  });
}

// ─── Citi Bike (LGA only — no docks at JFK/EWR) ─────────────────────────────
function bikeOption(trip) {
  const { airport, miles, borough } = trip;
  if (airport !== 'LGA' || borough === 'New Jersey' || miles > 10) return null;
  const minutes = [r(miles * 5.5 + 5), r(miles * 7 + 12)];
  const perMin = getFare('citibike_ebike_per_min');
  const unlock = getFare('citibike_single_ride');
  const cost = [r(unlock + minutes[0] * perMin), r(unlock + minutes[1] * perMin)];
  return {
    id: 'citibike', kind: 'bike', name: 'Citi Bike (e-bike)', cost, costKind: 'estimate', time: minutes, lines: [],
    warnings: [{ level: 'info', text: 'Only realistic with a backpack or small carry-on. Docks at LGA Terminal B / 94th St; check the Citi Bike or Lyft app for availability.' }],
    tips: [`E-bikes cost $${perMin.toFixed(2)}/min for non-members on top of the unlock fee; classic bikes are included in a single ride (30 min) or day pass.`, `Annual membership is $${getFare('citibike_annual')}/yr and cuts e-bike minutes to a member rate.`, 'Bridges into Manhattan have protected bike lanes (RFK / Queensboro).'],
    breakdown: [{ label: 'Single-ride unlock', amount: unlock, approximate: true }, { label: `E-bike $${perMin.toFixed(2)}/min × ${minutes[0]}–${minutes[1]} min`, amount: null, range: [r(minutes[0] * perMin), r(minutes[1] * perMin)] }],
    calories: [r(miles * 20), r(miles * 35)], co2: 0, roadExposed: false, fareKeys: ['citibike_ebike_per_min', 'citibike_single_ride', 'citibike_annual'],
  };
}

export function buildOptions({ origin, destination, date = new Date(), weather = 'clear', roadOverride = null }) {
  const profile = trafficProfile(date, weather);
  const trip = resolveTrip(origin, destination, roadOverride);
  const list = [
    ...transitOptions(trip, profile, date),
    taxiOption(trip, profile),
    ...rideshareOptions(trip, profile, weather, origin, destination),
    shuttleOption(trip, profile),
    ...carServiceOptions(trip, profile),
    goAirlinkOption(trip, profile),
    bladeOption(trip, profile),
    bikeOption(trip),
  ].filter(Boolean);
  const options = list.map((o) => {
    const costMid = mid(o.cost), timeMid = mid(o.time);
    return { ...o, costMid, timeMid, miles: trip.miles, costPerMin: costMid / timeMid, costPerMile: costMid / trip.miles, costPerMinRange: [o.cost[0] / o.time[1], o.cost[1] / o.time[0]], costPerMileRange: [o.cost[0] / trip.miles, o.cost[1] / trip.miles] };
  });
  return { options, profile, trip };
}
