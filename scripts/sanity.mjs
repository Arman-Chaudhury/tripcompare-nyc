// Route-math sanity checks from the spec. Run: npm run check
import { getFare, fares } from '../src/data/fares.js';
import { buildOptions } from '../src/lib/options.js';
import { annotateTimeValue } from '../src/lib/timeValue.js';
import { airportPlace, presetPlace } from '../src/lib/geo.js';

const offPromo = new Date('2026-10-15T14:00:00-04:00'); // Wed 2pm, promo expired, off-peak
const onPromo = new Date('2026-08-20T14:00:00-04:00');
const peak = new Date('2026-10-15T08:00:00-04:00'); // Wed 8am → arrives ~8:45, peak
let fail = 0;
const eq = (label, got, want) => {
  const ok = Math.abs(got - want) < 0.011;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${got}, want ${want}`);
};

eq('AirTrain base (no promo)', getFare('airtrain_jfk', offPromo), 8.75);
eq('AirTrain promo', getFare('airtrain_jfk', onPromo), 4.4);

const find = (opts, id) => opts.find((o) => o.id === id);

let { options } = buildOptions({ origin: airportPlace('JFK'), destination: presetPlace('midtown'), date: offPromo });
eq('JFK→Midtown AirTrain+E (base)', find(options, 'jfk-airtrain-e').cost[0], 11.75);
eq('JFK→Midtown AirTrain+LIRR off-peak', find(options, 'jfk-airtrain-lirr').cost[0], 14.0);
({ options } = buildOptions({ origin: airportPlace('JFK'), destination: presetPlace('midtown'), date: peak }));
eq('JFK→Midtown AirTrain+LIRR peak', find(options, 'jfk-airtrain-lirr').cost[0], 16.0);
({ options } = buildOptions({ origin: airportPlace('JFK'), destination: presetPlace('midtown'), date: onPromo }));
eq('JFK→Midtown AirTrain+E (promo)', find(options, 'jfk-airtrain-e').cost[0], 7.4);

const taxi = find(options, 'taxi');
console.log(`INFO JFK→Midtown taxi Wed 2pm: $${taxi.cost[0]}–${taxi.cost[1]}, ${taxi.time[0]}–${taxi.time[1]} min (spec: ~$90–115, 45–75+ min)`);
const lirr = find(options, 'jfk-airtrain-lirr');
console.log(`INFO AirTrain+LIRR to Penn: ${lirr.time[0]}–${lirr.time[1]} min (spec: ~50–60)`);
const rs = find(options, 'uber');
console.log(`INFO UberX JFK→Midtown Wed 2pm: $${rs.cost[0]}–${rs.cost[1]} (spec: ~$60–110)`);
console.log('INFO modes JFK→Midtown:', options.map((o) => `${o.id} $${o.costMid.toFixed(0)} ${o.costPerMile.toFixed(2)}/mi ${o.costPerMin.toFixed(2)}/min`).join(' | '));
const pm = buildOptions({ origin: airportPlace('JFK'), destination: presetPlace('midtown'), date: new Date('2026-10-15T17:30:00-04:00') });
const t2 = find(pm.options, 'taxi');
console.log(`INFO JFK→Midtown taxi Wed 5:30pm: $${t2.cost[0]}–${t2.cost[1]}, ${t2.time[0]}–${t2.time[1]} min (rush surcharge applies)`);

// Custom address (Nominatim-free): Times Sq coords → should snap to Midtown with transit.
const ts = { kind: 'custom', id: 'x', name: '1560 Broadway', lat: 40.758, lng: -73.9855 };
const c = buildOptions({ origin: airportPlace('JFK'), destination: ts, date: offPromo });
console.log(`INFO custom Times Sq: trip→${c.trip.dest.id}, lastMile ${c.trip.lastMileMi.toFixed(2)} mi, ${c.options.length} options, transit=${c.options.some(o=>o.kind==='transit')}`);
const far = buildOptions({ origin: { kind:'custom', id:'y', name:'Yonkers', lat: 40.93, lng: -73.90 }, destination: presetPlace('midtown'), date: offPromo });
console.log(`INFO Yonkers→Midtown (no airport): ${far.options.map(o=>o.id).join(', ')} | ${far.trip.notes[0]}`);

// Every (airport, destination) pairing yields options and every fare key resolves.
import { destinations, airports } from '../src/data/destinations.js';
for (const ap of Object.keys(airports))
  for (const d of destinations) {
    const { options } = buildOptions({ origin: airportPlace(ap), destination: presetPlace(d.id), date: offPromo });
    const rev = buildOptions({ origin: presetPlace(d.id), destination: airportPlace(ap), date: offPromo }).options;
    if (rev.filter((o) => o.id !== 'shuttle').length !== options.filter((o) => o.id !== 'shuttle').length) { fail++; console.log(`FAIL reverse mismatch ${ap}←${d.id}`); }
    const ann = annotateTimeValue(options);
    if (!options.length) { fail++; console.log(`FAIL no options ${ap}→${d.id}`); }
    for (const o of ann) {
      if (!(o.cost[0] <= o.cost[1]) || !(o.time[0] <= o.time[1])) { fail++; console.log(`FAIL bad range ${ap}→${d.id} ${o.id}`); }
      for (const k of o.fareKeys ?? []) if (!fares[k]) { fail++; console.log(`FAIL unknown fare ${k}`); }
    }
  }
// Help-a-passenger needs: group totals and luggage/mobility filters.
import { applyNeed, needToQuery, needFromQuery, carsForParty } from '../src/lib/assist.js';
{
  const base = buildOptions({ origin: airportPlace('JFK'), destination: presetPlace('midtown'), date: offPromo }).options;
  const g5 = applyNeed(base, { need: 'group', party: 5 }).options;
  eq('group of 5: taxi × 2 cars', find(g5, 'taxi').cost[0], find(base, 'taxi').cost[0] * 2);
  eq('group of 5: AirTrain+E × 5 seats', find(g5, 'jfk-airtrain-e').cost[0], +(find(base, 'jfk-airtrain-e').cost[0] * 5).toFixed(2));
  eq('group of 5: time unchanged', find(g5, 'taxi').time[1], find(base, 'taxi').time[1]);
  eq('cars for 4 / 5 / 8', carsForParty(4) * 100 + carsForParty(5) * 10 + carsForParty(8), 122);
  const lga = buildOptions({ origin: airportPlace('LGA'), destination: presetPlace('astoria'), date: offPromo }).options;
  if (!find(lga, 'citibike')) { fail++; console.log('FAIL LGA→Astoria should offer Citi Bike'); }
  for (const need of ['luggage', 'mobility', 'group']) if (find(applyNeed(lga, { need, party: 2 }).options, 'citibike')) { fail++; console.log(`FAIL ${need} should drop Citi Bike`); }
  if (applyNeed(lga, { need: 'cheapest' }).options !== lga) { fail++; console.log('FAIL non-filter need must pass options through'); }
  const q = needToQuery('group', 12);
  if (q.party !== '8' || q.sort !== 'value') { fail++; console.log('FAIL group query', q); }
  const back = needFromQuery({ need: 'group', party: '3' });
  if (back.need !== 'group' || back.party !== 3) { fail++; console.log('FAIL needFromQuery', back); }
  if (needFromQuery({ need: 'bogus' }).need !== null) { fail++; console.log('FAIL unknown need must be ignored'); }
}

// Route-text translation coverage: every string the engine can emit, for every
// trip and time of day, must have an entry (exact or template) in each dictionary.
import { tx, hasTranslation, routeTextLanguages, localizeOption } from '../src/lib/routeText.js';
import { strings } from '../src/lib/i18n.js';
{
  const custom = { kind: 'custom', id: 'x', name: '1560 Broadway', lat: 40.758, lng: -73.9855 };
  const farAway = { kind: 'custom', id: 'y', name: 'Yonkers', lat: 40.93, lng: -73.90 };
  const nearJfk = { kind: 'custom', id: 'z', name: 'Rosedale', lat: 40.6627, lng: -73.7355 };
  const times = ['2026-10-15T14:00', '2026-10-15T08:00', '2026-10-15T17:30', '2026-10-16T02:00', '2026-10-17T13:00', '2026-08-20T14:00'].map((d) => new Date(`${d}:00-04:00`));
  const trips = [];
  for (const ap of Object.keys(airports)) for (const d of destinations) trips.push([airportPlace(ap), presetPlace(d.id)], [presetPlace(d.id), airportPlace(ap)]);
  trips.push([airportPlace('JFK'), custom], [farAway, presetPlace('midtown')], [airportPlace('LGA'), farAway], [airportPlace('JFK'), airportPlace('LGA')], [nearJfk, presetPlace('midtown')], [presetPlace('midtown'), nearJfk]);
  const emitted = new Set();
  for (const [o, d] of trips) for (const date of times) for (const weather of ['clear', 'rain']) {
    const { options, trip } = buildOptions({ origin: o, destination: d, date, weather });
    trip.notes.forEach((n) => emitted.add(n));
    const withGroup = [...options, ...applyNeed(options, { need: 'group', party: 5 }).options, ...applyNeed(options, { need: 'group', party: 2 }).options];
    for (const x of withGroup) {
      emitted.add(x.name); x.steps?.forEach((v) => emitted.add(v)); x.tips?.forEach((v) => emitted.add(v));
      x.warnings.forEach((w) => emitted.add(w.text)); x.breakdown.forEach((b) => emitted.add(b.label)); if (x.promo) emitted.add(x.promo.label);
    }
  }
  for (const lang of routeTextLanguages) {
    const missing = [...emitted].filter((s) => !hasTranslation(lang, s));
    if (missing.length) { fail++; console.log(`FAIL ${lang} route text: ${missing.length} untranslated string(s):`); missing.forEach((m) => console.log(`   ${JSON.stringify(m)}`)); }
    else console.log(`PASS ${lang} route text covers all ${emitted.size} engine strings`);
    const unresolved = [...emitted].map((s) => tx(lang, s)).filter((s) => /\{\w+\}/.test(s));
    if (unresolved.length) { fail++; console.log(`FAIL ${lang} leaves placeholders: ${unresolved.slice(0, 3).join(' | ')}`); }
  }
  eq('template: meter label substitutes miles', tx('es', 'Meter: $3.00 + $0.70 × ⅕ mi (13.8 mi)').includes('13.8') ? 1 : 0, 1);
  eq('template: surge label translated inside breakdown', tx('es', 'Demand multiplier (highDemand)').includes('alta demanda') ? 1 : 0, 1);
  eq('unknown strings pass through', tx('zh', 'Some brand-new tip') === 'Some brand-new tip' ? 1 : 0, 1);
  const base = buildOptions({ origin: airportPlace('JFK'), destination: presetPlace('midtown'), date: offPromo }).options;
  const zhTaxi = localizeOption(find(base, 'taxi'), 'zh');
  eq('localizeOption keeps numbers', zhTaxi.cost[0], find(base, 'taxi').cost[0]);
  if (zhTaxi.name !== '黄色出租车') { fail++; console.log('FAIL zh taxi name', zhTaxi.name); }
  // UI string tables: every language has every English key.
  for (const [lang, table] of Object.entries(strings)) {
    const missing = Object.keys(strings.en).filter((k) => !(k in table));
    const extra = Object.keys(table).filter((k) => !(k in strings.en));
    if (missing.length || extra.length) { fail++; console.log(`FAIL ui strings ${lang}: missing ${missing.join(',')} extra ${extra.join(',')}`); }
  }
}

console.log(fail ? `\n${fail} failure(s)` : '\nAll sanity checks passed.');
process.exit(fail ? 1 : 0);
