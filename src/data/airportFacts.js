// Airport reference for the Airports tab: what each field serves and how you
// reach it by transit. JFK/LGA/EWR are priced by the engine (lib/options.js);
// the smaller fields are listed for completeness with their transit link only.
import { getFare } from './fares.js';

export const AIRPORT_FACTS = {
  JFK: {
    terminals: 'Terminals 1, 4, 5, 7, 8 (new T1 and T6 under construction; T2 and T3 closed)',
    hubs: 'Delta (T4), JetBlue (T5), American (T8), most international carriers (T1, T4, T7)',
    transit: ['AT', 'E', 'LIRR'],
    transitText: 'AirTrain ($8.75) to Jamaica for the E/J/Z and LIRR, or to Howard Beach for the A.',
    note: 'Roads are torn up through ~2030 and pickup points move. Longest curb-to-curb trip of the three, best rail link.',
  },
  LGA: {
    terminals: 'Terminals A (Marine Air), B, C (Delta)',
    hubs: 'Delta (C), American / United / JetBlue / Southwest / Spirit (B)',
    transit: ['Q70', 'M60'],
    transitText: 'Free Q70 bus to Jackson Hts–Roosevelt Av (E F M R 7) and Woodside (7, LIRR); M60 to Harlem / 125th St.',
    note: 'Closest to Manhattan by road. No rail, but rebuilt terminals and the free Q70 make it the cheapest transit trip.',
  },
  EWR: {
    terminals: 'Terminals A (new), B, C (United)',
    hubs: 'United (C and A), most international carriers (B)',
    transit: ['AT', 'NJT'],
    transitText: 'AirTrain to Newark Liberty rail station, then NJ Transit or Amtrak to Penn Station (one ticket, AirTrain included).',
    note: 'In New Jersey: cabs from NYC add Hudson-crossing tolls and a surcharge. NJ Transit to Penn is often the fastest way into Midtown.',
  },
};

// Smaller fields with commercial service, not priced by the engine.
export const SMALL_AIRPORTS = [
  { code: 'HPN', name: 'Westchester County', where: 'White Plains, NY (about 35 mi north of Midtown)', transit: 'Metro-North Harlem Line to White Plains, then Bee-Line bus 12 or a short taxi.', flights: 'JetBlue, American, Delta, United regionals' },
  { code: 'ISP', name: 'Long Island MacArthur', where: 'Ronkonkoma, NY (about 50 mi east of Midtown)', transit: 'LIRR Ronkonkoma Branch, then Suffolk Transit S57 or a short taxi.', flights: 'Southwest, Breeze, Frontier' },
  { code: 'SWF', name: 'New York Stewart', where: 'Newburgh, NY (about 65 mi north of Midtown)', transit: 'Stewart Airport Express coach to Port Authority, or Metro-North Hudson Line to Beacon plus a shuttle.', flights: 'Allegiant, Breeze, PLAY' },
  { code: 'HVN', name: 'Tweed New Haven', where: 'New Haven, CT (about 75 mi northeast of Midtown)', transit: 'Metro-North New Haven Line to New Haven State St, then a short taxi or the CTtransit 206 bus.', flights: 'Avelo, Breeze' },
];

// Curated transit itineraries between the three big airports. The engine
// only prices car modes airport-to-airport (no curated neighborhood sits
// within its snap radius), so these use the verified fare table directly.
export function airportTransitLinks(date = new Date()) {
  const airtrain = getFare('airtrain_jfk', date);
  const subway = getFare('subway', date);
  const njt = getFare('njt_ewr_penn', date);
  const lirr = getFare('lirr_cityticket_offpeak', date);
  return {
    'JFK-LGA': { lines: ['AT', 'E', 'Q70'], cost: +(airtrain + subway).toFixed(2), time: [75, 100], steps: 'AirTrain to Jamaica, E to Jackson Hts–Roosevelt Av, free Q70 to LGA.' },
    'EWR-JFK': { lines: ['AT', 'LIRR', 'NJT'], cost: +(airtrain + lirr + njt).toFixed(2), time: [110, 150], steps: 'AirTrain to Jamaica, LIRR to Penn Station, NJ Transit to Newark Airport (AirTrain included).' },
    'EWR-LGA': { lines: ['Q70', 'E', 'NJT'], cost: +(subway + njt).toFixed(2), time: [95, 130], steps: 'Free Q70 to Jackson Hts, E to Penn Station, NJ Transit to Newark Airport (AirTrain included).' },
  };
}
export const pairKey = (a, b) => [a, b].sort().join('-');
