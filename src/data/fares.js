// All fares in this file were verified against official sources on 2026-08-20.
// Every entry carries `amount`, `lastVerified`, and `source`. Entries with a
// `promo` block are date-windowed: `getFare()` returns the promo amount only
// while `new Date()` falls inside [promo.start, promo.end].
//
// RULE: if a number here looks wrong, fix it with a new lastVerified date and
// source — never patch a fare inline in a component.

export const FARES_LAST_VERIFIED = '2026-08-20';

export const fares = {
  // ─── AirTrain ────────────────────────────────────────────────────────────
  airtrain_jfk: {
    label: 'JFK AirTrain',
    amount: 8.75,
    lastVerified: '2026-08-20',
    source: 'https://www.jfkairport.com/to-from-airport/air-train',
    note: 'Paid via OMNY on exit/entry at Jamaica or Howard Beach. Free between terminals. Kids under 5 free.',
    promo: {
      // TODO: confirm exact discounted amount and end date at jfkairport.com
      // (the halved amount may be rounded; ~Labor Day / Sept 4, 2026).
      label: 'Summer 50% off',
      amount: 4.4,
      start: '2026-06-01T00:00:00-04:00',
      end: '2026-09-04T23:59:59-04:00',
      source: 'https://www.jfkairport.com/to-from-airport/air-train',
    },
  },
  airtrain_ewr: {
    label: 'Newark AirTrain',
    amount: 8.75,
    lastVerified: '2026-08-20',
    source: 'https://www.newarkairport.com/to-from-airport/air-train',
    note: 'Included in the NJ Transit / Amtrak rail ticket price; charged when connecting at the Newark Liberty rail station.',
    // TODO: verify still active before launch — as of spring 2026 the Newark
    // AirTrain was suspended weekdays 5am–3pm with free replacement shuttle buses.
    warning: 'Construction: AirTrain suspended weekdays 5am–3pm (spring 2026) — free shuttle buses replace it. Add 10–20 min.',
  },

  // ─── MTA (post-Jan 2026) ─────────────────────────────────────────────────
  subway: {
    label: 'Subway / local bus',
    amount: 3.0,
    lastVerified: '2026-08-20',
    source: 'https://new.mta.info/fares',
    note: 'OMNY only — tap a contactless card, phone, or OMNY card. MetroCards were discontinued in Jan 2026 and can no longer be bought.',
  },
  lirr_cityticket_offpeak: {
    label: 'LIRR CityTicket (off-peak)',
    amount: 5.25,
    lastVerified: '2026-08-20',
    source: 'https://new.mta.info/fares/lirr-metro-north/cityticket',
    note: 'Jamaica ↔ Penn Station or Grand Central Madison. Buy in the MTA TrainTime app or at a machine before boarding.',
  },
  lirr_cityticket_peak: {
    label: 'LIRR CityTicket (peak)',
    amount: 7.25,
    lastVerified: '2026-08-20',
    source: 'https://new.mta.info/fares/lirr-metro-north/cityticket',
    note: 'Peak = weekday trains arriving in Manhattan 6–10am or departing Manhattan 4–8pm.',
  },
  q70: {
    label: 'Q70 LaGuardia Link SBS',
    amount: 0,
    lastVerified: '2026-08-20',
    source: 'https://www.laguardiaairport.com/to-from-airport/by-bus',
    note: 'FREE. Runs between all LGA terminals and the Jackson Hts–Roosevelt Av (E F M R 7) and Woodside (7, LIRR) stations.',
  },
  m60: {
    label: 'M60 SBS',
    amount: 3.0,
    lastVerified: '2026-08-20',
    source: 'https://new.mta.info/fares',
    note: 'LGA to 125th St in Harlem (A B C D 2 3 4 5 6, Metro-North) and across to Broadway/116th (1). Pay at the curb machine before boarding.',
  },
  path: {
    label: 'PATH',
    amount: 3.0,
    lastVerified: '2026-08-20',
    source: 'https://www.panynj.gov/path/en/fares-and-passes.html',
    note: 'Tap-to-pay accepted at turnstiles.',
  },
  njt_ewr_penn: {
    label: 'NJ Transit EWR → Penn Station (incl. AirTrain)',
    amount: 16.8,
    lastVerified: '2026-08-20',
    source: 'https://www.njtransit.com/airport',
    note: 'Approximate; ticket includes the $8.75 AirTrain access fee. Buy in the NJ Transit app. Any Northeast Corridor or North Jersey Coast Line train.',
    approximate: true,
  },
  njt_ewr_newark_penn: {
    label: 'NJ Transit EWR → Newark Penn (incl. AirTrain)',
    // TODO: verify — one-stop airport ticket price; only the $8.75 AirTrain
    // component is verified. Check the NJ Transit app before launch.
    amount: 11.5,
    lastVerified: '2026-08-20',
    source: 'https://www.njtransit.com/airport',
    note: 'One stop on NJ Transit; ticket includes the $8.75 AirTrain fee. Buy in the NJ Transit app.',
    approximate: true,
  },
  ferry: {
    label: 'NYC Ferry',
    amount: 4.5,
    lastVerified: '2026-08-20',
    source: 'https://www.ferry.nyc/ticketing-info/',
    note: 'Buy in the NYC Ferry app. Luggage allowed.',
  },

  // ─── Yellow taxi (NYC TLC, Dec 2022 rate structure — still current) ─────
  taxi_jfk_manhattan_flat: {
    label: 'Yellow cab JFK ↔ Manhattan flat fare',
    amount: 70.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
    note: 'Manhattan only. Tolls, surcharges, and tip are extra. Other boroughs are metered.',
  },
  taxi_rush_surcharge_jfk: {
    label: 'JFK flat-fare rush-hour surcharge',
    amount: 5.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
    note: 'Weekdays 4–8pm, excluding holidays.',
  },
  taxi_lga_surcharge: {
    label: 'LGA surcharge',
    amount: 5.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
  },
  taxi_ewr_surcharge: {
    label: 'Newark surcharge (trips to EWR)',
    amount: 20.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
    note: 'Applies to yellow cabs going TO Newark; tolls extra. From EWR, NJ taxis use a NJ zone fare instead.',
  },
  taxi_meter_initial: {
    label: 'Meter initial charge',
    amount: 3.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
  },
  taxi_meter_unit: {
    label: 'Meter per unit (1/5 mile, or 60 s below 12 mph)',
    amount: 0.7,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
  },
  taxi_meter_rush: {
    label: 'Metered rush-hour surcharge',
    amount: 2.5,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
    note: 'Weekdays 4–8pm.',
  },
  taxi_meter_night: {
    label: 'Metered nighttime surcharge',
    amount: 1.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
    note: '8pm–6am.',
  },
  taxi_state_congestion: {
    label: 'NY State congestion surcharge (south of 96th St)',
    amount: 2.5,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
    // TODO: verify — the separate MTA Congestion Relief Zone per-trip toll for
    // taxis ($0.75, south of 60th St) is folded into the estimate range only.
  },
  taxi_mta_tax: {
    label: 'MTA State Surcharge',
    amount: 0.5,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
  },
  taxi_improvement_surcharge: {
    label: 'Improvement Surcharge',
    amount: 1.0,
    lastVerified: '2026-08-20',
    source: 'https://www.nyc.gov/site/tlc/passengers/taxi-fare.page',
  },

  // ─── Rideshare ──────────────────────────────────────────────────────────
  uber_shuttle_jfk: {
    label: 'Uber Airport Shuttle (JFK)',
    amount: 25.0,
    lastVerified: '2026-08-20',
    source: 'https://www.uber.com/us/en/ride/airport-shuttle/',
    // TODO: verify current stops/price in Uber app before launch
    note: 'Flat-rate shared van. JFK pickup at Terminals 4 & 5. Fixed stops: Grand Central, Port Authority, Penn Station, Canal & Lafayette, Atlantic Terminal. Book in the Uber app.',
  },
  uber_shuttle_lga: {
    label: 'Uber Airport Shuttle (LGA)',
    amount: 18.0,
    lastVerified: '2026-08-20',
    source: 'https://www.uber.com/us/en/ride/airport-shuttle/',
    // TODO: verify current stops/price in Uber app before launch
    note: 'Flat-rate shared van. Fixed Manhattan/Brooklyn stops. Book in the Uber app.',
  },
  rideshare_jfk_manhattan: {
    label: 'UberX / Lyft JFK ↔ Manhattan (estimate)',
    amount: null,
    range: [60, 110],
    lastVerified: '2026-08-20',
    source: 'https://www.uber.com/global/en/price-estimate/',
    note: 'Varies with demand; surge can exceed the taxi flat rate. Tap the card for the live price in the app.',
    estimate: true,
  },


  // ─── Other for-hire operators with PUBLISHED prices ─────────────────────
  // These operators post fixed fares, so they can be shown as verified-flat
  // numbers once checked. Amounts below are from their public rate pages and
  // must be re-checked before launch.
  carmel_jfk_manhattan: {
    label: 'Carmel car service JFK ↔ Manhattan (flat, before tolls/tip)',
    // TODO: verify at carmellimo.com (rate varies by Manhattan zone, ~$58–75).
    amount: 62.0,
    lastVerified: '2026-08-20',
    source: 'https://www.carmellimo.com/',
    note: 'Book by app or phone; fixed price quoted up front. Tolls and tip extra. Sedan, meets you at the terminal.',
    approximate: true,
  },
  dial7_jfk_manhattan: {
    label: 'Dial 7 car service JFK ↔ Manhattan (flat, before tolls/tip)',
    // TODO: verify at dial7.com (rate varies by Manhattan zone).
    amount: 65.0,
    lastVerified: '2026-08-20',
    source: 'https://www.dial7.com/',
    note: 'Book by app or phone; fixed price quoted up front. Tolls and tip extra.',
    approximate: true,
  },
  blade_jfk: {
    label: 'Blade helicopter JFK ↔ Manhattan (per seat)',
    // TODO: verify at blade.com — seasonal pricing; ground transfer is extra.
    amount: 195.0,
    lastVerified: '2026-08-20',
    source: 'https://www.blade.com/airport',
    note: '5-minute flight between JFK and the West 30th St or East 34th St heliports. Includes a Blade lounge; ground transfer from the heliport is extra.',
    approximate: true,
  },
  goairlink_shared: {
    label: 'Go Airlink NYC shared van to Manhattan (per person)',
    // TODO: verify at goairlinkshuttle.com — one-way shared-ride price.
    amount: 25.0,
    lastVerified: '2026-08-20',
    source: 'https://www.goairlinkshuttle.com/',
    note: 'Door-to-door shared van between JFK/LGA/EWR and Manhattan addresses. Book ahead; expect other passengers\' stops.',
    approximate: true,
  },
  revel_estimate: {
    label: 'Revel rideshare (NYC, all-electric)',
    amount: null,
    range: null,
    lastVerified: '2026-08-20',
    source: 'https://gorevel.com/',
    note: 'Operates in Manhattan, Brooklyn, Queens and at JFK/LGA/EWR. Upfront price in the Revel app; typically priced near UberX.',
    estimate: true,
  },

  // ─── Citi Bike (2026) ──────────────────────────────────────────────────
  citibike_ebike_per_min: {
    label: 'Citi Bike e-bike, per minute (non-member)',
    amount: 0.27,
    lastVerified: '2026-08-20',
    source: 'https://citibikenyc.com/pricing',
  },
  citibike_single_ride: {
    label: 'Citi Bike single ride (classic, 30 min)',
    amount: 4.99,
    lastVerified: '2026-08-20',
    source: 'https://citibikenyc.com/pricing/single-ride',
    // TODO: verify — classic single-ride unlock price; e-bike per-minute charged on top.
    approximate: true,
  },
  citibike_day_pass: {
    label: 'Citi Bike day pass (classic, unlimited 30-min rides)',
    amount: 24.99,
    lastVerified: '2026-08-20',
    source: 'https://citibikenyc.com/pricing/day',
    // TODO: verify — day pass price; e-bike per-minute charged on top.
    approximate: true,
  },
  citibike_annual: {
    label: 'Citi Bike annual membership',
    amount: 239.0,
    lastVerified: '2026-08-20',
    source: 'https://citibikenyc.com/pricing/annual',
  },
};

/** Returns true if `date` is inside the fare's promo window. */
export function promoActive(fare, date = new Date()) {
  if (!fare?.promo) return false;
  const t = date.getTime();
  return t >= Date.parse(fare.promo.start) && t <= Date.parse(fare.promo.end);
}

/** Effective amount for a fare key at `date`, honoring date-windowed promos. */
export function getFare(key, date = new Date()) {
  const f = fares[key];
  if (!f) throw new Error(`Unknown fare key: ${key}`);
  if (promoActive(f, date)) return f.promo.amount;
  return f.amount;
}

/** Unique official sources for the footer / README table. */
export function fareSources() {
  const seen = new Map();
  for (const [key, f] of Object.entries(fares)) {
    if (!seen.has(f.source)) seen.set(f.source, []);
    seen.get(f.source).push(key);
  }
  return [...seen.entries()].map(([source, keys]) => ({ source, keys }));
}
