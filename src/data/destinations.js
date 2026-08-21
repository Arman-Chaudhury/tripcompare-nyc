// Airports, destinations, and the transit itineraries that connect them.
//
// Drive times are FREE-FLOW minutes (what Google Maps shows at 3am). The
// traffic model in lib/traffic.js multiplies them by a time-of-day range.
// Transit times are door-to-platform-to-door ranges that already include
// typical waits; they are NOT traffic-adjusted (rail doesn't sit in traffic).

export const airports = {
  JFK: {
    code: 'JFK',
    name: 'John F. Kennedy International',
    short: 'JFK',
    lat: 40.6413,
    lng: -73.7781,
    constructionWarning:
      'JFK is mid-way through a $19B redevelopment (through ~2030). Terminal-frontage roads are congested and pickup points move. Allow extra time for any car.',
    rideshareNote:
      'Uber/Lyft pickups have been relocated at some terminals: T4 → Lot 66 (midday), T5/T7 → a lot near Howard Beach with a shuttle. Follow the "App Rides" signs; check the app for your terminal.',
  },
  LGA: {
    code: 'LGA',
    name: 'LaGuardia',
    short: 'LGA',
    lat: 40.7769,
    lng: -73.874,
    rideshareNote:
      'Uber/Lyft pickup is at the designated ride-app lots (Terminal B: Level 2 of the parking garage; Terminal C: across the arrivals roadway). Follow the purple signs.',
  },
  EWR: {
    code: 'EWR',
    name: 'Newark Liberty International',
    short: 'EWR',
    lat: 40.6895,
    lng: -74.1745,
    rideshareNote:
      'Uber/Lyft pickup at EWR is on the arrivals level at designated "Ride App" zones (Terminal A: Level 1; B: Level 1; C: Level 1). Expect a wait for the driver to clear the lot.',
  },
};

// Station coordinates used to draw transit itineraries on the map.
export const STATIONS = {
  jamaica: [40.6996, -73.8087],
  howardBeach: [40.6605, -73.8303],
  penn: [40.7506, -73.9935],
  gcm: [40.7527, -73.9772],
  atlantic: [40.6844, -73.9776],
  woodside: [40.7456, -73.9029],
  jacksonHts: [40.7466, -73.8913],
  harlem125: [40.8046, -73.9376],
  astoriaBlvd: [40.7701, -73.9179],
  ewrRail: [40.7046, -74.1906],
  newarkPenn: [40.7347, -74.1644],
  wtc: [40.7126, -74.0099],
  courtSq: [40.7473, -73.9456],
  jaySt: [40.6923, -73.9873],
  marcy: [40.7083, -73.9579],
  flushingMain: [40.7596, -73.83],
};

// ─── Transit itinerary helpers ──────────────────────────────────────────────
// legs: fare keys (see data/fares.js). The special key 'lirr_cityticket'
// resolves to peak/off-peak based on the selected time.
const jfkE = (subwayMin, extra = {}) => ({
  id: 'jfk-airtrain-e',
  name: 'AirTrain + E train',
  legs: ['airtrain_jfk', 'subway'],
  lines: ['E'],
  time: [12 + subwayMin[0], 20 + subwayMin[1]],
  steps: ['AirTrain to Jamaica (8–12 min)', 'Tap OMNY to exit AirTrain', 'E train (Sutphin Blvd–Archer Av)'],
  tips: [
    'Look for the E platform downstairs from the AirTrain exit at Jamaica — Sutphin Blvd–Archer Av–JFK station.',
    'E is express in Queens daytime; overnight it runs local — add ~10 min after midnight.',
  ],
  via: ['jamaica'],
  ...extra,
});

const jfkLirr = (lirrMin, terminal, extra = {}) => ({
  id: 'jfk-airtrain-lirr',
  name: `AirTrain + LIRR to ${terminal}`,
  legs: ['airtrain_jfk', 'lirr_cityticket'],
  lines: ['LIRR'],
  time: [18 + lirrMin[0], 25 + lirrMin[1]],
  steps: ['Walk to AirTrain + ride to Jamaica (15–20 min)', 'Tap OMNY to exit AirTrain; buy CityTicket in TrainTime app', `LIRR from Jamaica to ${terminal} (~20 min ride)`],
  tips: [
    'Buy a CityTicket in the MTA TrainTime app before boarding — onboard purchase costs much more.',
    'Trains leave Jamaica every 5–15 min. Check the board: Penn Station and Grand Central Madison are different trains.',
    'Peak CityTicket applies weekdays arriving Manhattan 6–10am / leaving 4–8pm; off-peak otherwise.',
    'Usually the least-crowded rail option when you have big bags.',
  ],
  via: ['jamaica', terminal === 'Grand Central Madison' ? 'gcm' : terminal === 'Atlantic Terminal' ? 'atlantic' : 'penn'],
  ...extra,
});

const jfkA = (subwayMin, extra = {}) => ({
  id: 'jfk-airtrain-a',
  name: 'AirTrain + A train',
  legs: ['airtrain_jfk', 'subway'],
  lines: ['A'],
  time: [10 + subwayMin[0], 18 + subwayMin[1]],
  steps: ['AirTrain to Howard Beach (~10 min)', 'Tap OMNY to exit AirTrain', 'A train (Howard Beach–JFK Airport)'],
  tips: [
    'Only A trains marked "Far Rockaway" or "Rockaway Park" stop at Howard Beach — Lefferts Blvd trains do not.',
    'A train to Howard Beach runs every 10–20 min overnight; check arrival times before choosing this over the Jamaica side.',
  ],
  via: ['howardBeach'],
  ...extra,
});

const jfkJZ = (subwayMin, extra = {}) => ({
  id: 'jfk-airtrain-jz',
  name: 'AirTrain + J/Z train',
  legs: ['airtrain_jfk', 'subway'],
  lines: ['J', 'Z'],
  time: [12 + subwayMin[0], 20 + subwayMin[1]],
  steps: ['AirTrain to Jamaica (8–12 min)', 'Tap OMNY to exit AirTrain', 'J or Z train (Sutphin Blvd–Archer Av)'],
  tips: [
    'J/Z share the E platform mezzanine at Jamaica. Z runs only weekday rush hours (skip-stop).',
    'Slower than the E to Manhattan but direct to Williamsburg and the Lower East Side.',
  ],
  via: ['jamaica'],
  ...extra,
});

const lgaQ70 = (line, onwardMin, extra = {}) => ({
  id: `lga-q70-${line.toLowerCase()}`,
  name: `Q70 bus + ${line} train`,
  legs: ['q70', 'subway'],
  lines: [line],
  time: [15 + onwardMin[0], 30 + onwardMin[1]],
  steps: ['Free Q70 LaGuardia Link to Jackson Hts–Roosevelt Av (10–20 min)', `${line} train`],
  tips: [
    'The Q70 is FREE — just board; no tap needed. Runs every 8–10 min, 24/7, from all terminals.',
    'The Q70 has luggage racks. Get off at the Jackson Hts–Roosevelt Av stop for the E F M R and 7.',
    'Tap OMNY once at the subway turnstile ($3.00).',
  ],
  via: ['jacksonHts'],
  ...extra,
});

const lgaM60 = (onwardMin, extra = {}) => ({
  id: 'lga-m60',
  name: 'M60 SBS bus',
  legs: ['m60'],
  lines: ['M60'],
  time: [25 + onwardMin[0], 50 + onwardMin[1]],
  steps: ['M60 Select Bus Service across the RFK Bridge to 125th St'],
  tips: [
    'Pay at the curbside OMNY reader or ticket machine BEFORE boarding (SBS = proof of payment).',
    'Stops at every 125th St subway line (A B C D, 2 3, 4 5 6) and ends at Columbia / Broadway–116th (1 train).',
    'Traffic-exposed on the bridge — times stretch at rush hour.',
  ],
  roadExposed: true,
  via: ['astoriaBlvd', 'harlem125'],
  ...extra,
});

const ewrNjt = (onwardMin, extra = {}) => ({
  id: 'ewr-airtrain-njt',
  name: 'AirTrain + NJ Transit to Penn Station',
  legs: ['njt_ewr_penn'],
  lines: ['NJT'],
  time: [40 + onwardMin[0], 60 + onwardMin[1]],
  steps: ['AirTrain to Newark Liberty Airport rail station (8–15 min)', 'NJ Transit NE Corridor / NJ Coast Line to New York Penn (~30 min)'],
  tips: [
    'Buy the "Newark Airport → New York Penn" ticket in the NJ Transit app; it includes the AirTrain fee and is scanned at the AirTrain gates.',
    'Trains run every 10–30 min. Any train to "New York" works; Amtrak is far more expensive.',
  ],
  warningKey: 'airtrain_ewr',
  via: ['ewrRail', 'penn'],
  ...extra,
});

const ewrNjtSubway = (line, onwardMin, extra = {}) => ({
  id: `ewr-airtrain-njt-${line.toLowerCase()}`,
  name: `AirTrain + NJ Transit + ${line} train`,
  legs: ['njt_ewr_penn', 'subway'],
  lines: ['NJT', line],
  time: [45 + onwardMin[0], 70 + onwardMin[1]],
  steps: ['AirTrain + NJ Transit to New York Penn (40–60 min)', `${line} train from 34 St–Penn Station`],
  tips: [
    'Buy the NJ Transit airport ticket in the app (includes AirTrain).',
    'Tap OMNY at the subway turnstile in Penn Station ($3.00).',
  ],
  warningKey: 'airtrain_ewr',
  via: ['ewrRail', 'penn'],
  ...extra,
});

const ewrPath = (onwardMin, extra = {}) => ({
  id: 'ewr-airtrain-path',
  name: 'AirTrain + NJ Transit + PATH',
  legs: ['njt_ewr_newark_penn', 'path'],
  lines: ['NJT', 'PATH'],
  time: [40 + onwardMin[0], 65 + onwardMin[1]],
  steps: ['AirTrain + NJ Transit one stop to Newark Penn Station', 'PATH from Newark Penn (World Trade Center line)'],
  tips: [
    'NJ Transit to Newark Penn is one stop (~5 min). The ticket includes the AirTrain fee.',
    'PATH runs 24/7; tap to pay at the turnstile. Transfer at Journal Square for Hoboken/33rd St trains.',
  ],
  warningKey: 'airtrain_ewr',
  via: ['ewrRail', 'newarkPenn', 'wtc'],
  ...extra,
});

// ─── Destinations ───────────────────────────────────────────────────────────
// drive: free-flow minutes. miles: road miles. southOf96: NYS congestion
// surcharge zone (Manhattan south of 96th). crz: MTA Congestion Relief Zone
// (south of 60th). ferry: route id if a reasonable ferry leg exists.
export const destinations = [
  {
    id: 'midtown',
    name: 'Midtown Manhattan',
    hint: 'Times Sq · Penn Station · Grand Central',
    borough: 'Manhattan',
    southOf96: true,
    crz: true,
    lat: 40.755,
    lng: -73.9865,
    drive: { JFK: 40, LGA: 25, EWR: 40 },
    miles: { JFK: 16, LGA: 9, EWR: 16 },
    uberShuttle: { JFK: true, LGA: true },
    transit: {
      JFK: [jfkLirr([30, 35], 'Penn Station'), jfkE([45, 55]), jfkLirr([30, 35], 'Grand Central Madison', { id: 'jfk-airtrain-lirr-gcm' })],
      LGA: [lgaQ70('E', [20, 30]), lgaQ70('7', [20, 30]), lgaM60([15, 25], { name: 'M60 SBS + subway', legs: ['m60', 'subway'], lines: ['M60', 'A', 'B', 'C', 'D'] })],
      EWR: [ewrNjt([0, 5])],
    },
  },
  {
    id: 'lower-manhattan',
    name: 'Lower Manhattan',
    hint: 'Financial District · WTC · Tribeca',
    borough: 'Manhattan',
    southOf96: true,
    crz: true,
    lat: 40.7097,
    lng: -74.0092,
    drive: { JFK: 40, LGA: 35, EWR: 35 },
    miles: { JFK: 15, LGA: 12, EWR: 13 },
    uberShuttle: { JFK: true, LGA: true },
    transit: {
      JFK: [jfkA([55, 70]), jfkE([50, 60]), jfkJZ([55, 70])],
      LGA: [lgaQ70('E', [30, 40]), lgaQ70('E', [30, 40], { id: 'lga-q70-r', name: 'Q70 bus + R train', lines: ['R'] })],
      EWR: [ewrPath([20, 25]), ewrNjtSubway('1', [20, 25])],
    },
  },
  {
    id: 'chelsea-west-village',
    name: 'Chelsea / West Village',
    hint: 'High Line · Meatpacking · Union Sq',
    borough: 'Manhattan',
    southOf96: true,
    crz: true,
    lat: 40.7402,
    lng: -74.0006,
    drive: { JFK: 40, LGA: 30, EWR: 40 },
    miles: { JFK: 16, LGA: 10, EWR: 15 },
    uberShuttle: { JFK: true, LGA: true },
    transit: {
      JFK: [jfkE([45, 55]), jfkLirr([25, 40], 'Penn Station', { name: 'AirTrain + LIRR + walk/1 train', time: [45, 70] })],
      LGA: [lgaQ70('E', [25, 35])],
      EWR: [ewrNjt([5, 15]), ewrPath([15, 25], { name: 'AirTrain + NJ Transit + PATH (to 14th/23rd St)' })],
    },
  },
  {
    id: 'upper-east-side',
    name: 'Upper East Side',
    hint: 'Museum Mile · Lenox Hill',
    borough: 'Manhattan',
    southOf96: true,
    crz: false,
    lat: 40.7736,
    lng: -73.9566,
    drive: { JFK: 40, LGA: 20, EWR: 45 },
    miles: { JFK: 17, LGA: 8, EWR: 18 },
    uberShuttle: { JFK: true, LGA: true },
    transit: {
      JFK: [jfkLirr([30, 45], 'Grand Central Madison', { id: 'jfk-airtrain-lirr-gcm', name: 'AirTrain + LIRR to Grand Central + 4/5/6', legs: ['airtrain_jfk', 'lirr_cityticket', 'subway'], lines: ['LIRR', '6'] }), jfkE([55, 70], { name: 'AirTrain + E + 6 train', lines: ['E', '6'] })],
      LGA: [lgaM60([10, 20], { name: 'M60 SBS + 4/5/6', legs: ['m60', 'subway'], lines: ['M60', '6'] }), lgaQ70('E', [30, 40], { name: 'Q70 bus + E + 6 train', lines: ['E', '6'] })],
      EWR: [ewrNjtSubway('6', [25, 35], { lines: ['NJT', '6'] })],
    },
  },
  {
    id: 'upper-west-side',
    name: 'Upper West Side',
    hint: 'Lincoln Center · Columbia',
    borough: 'Manhattan',
    southOf96: true,
    crz: false,
    lat: 40.787,
    lng: -73.9754,
    drive: { JFK: 45, LGA: 25, EWR: 45 },
    miles: { JFK: 19, LGA: 10, EWR: 17 },
    uberShuttle: { JFK: true, LGA: true },
    transit: {
      JFK: [jfkA([65, 80]), jfkLirr([25, 40], 'Penn Station', { name: 'AirTrain + LIRR + 1/2/3 train', legs: ['airtrain_jfk', 'lirr_cityticket', 'subway'], lines: ['LIRR', '1', '2', '3'] })],
      LGA: [lgaM60([5, 15], { name: 'M60 SBS to Broadway/116th' }), lgaQ70('E', [35, 45], { name: 'Q70 bus + E + 1/2/3', lines: ['E', '1', '2', '3'] })],
      EWR: [ewrNjtSubway('1', [20, 30], { lines: ['NJT', '1', '2', '3'] })],
    },
  },
  {
    id: 'harlem',
    name: 'Harlem',
    hint: '125th St · Apollo',
    borough: 'Manhattan',
    southOf96: false,
    crz: false,
    lat: 40.8116,
    lng: -73.9465,
    drive: { JFK: 45, LGA: 20, EWR: 45 },
    miles: { JFK: 19, LGA: 8, EWR: 18 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [jfkA([65, 80], { name: 'AirTrain + A train (express to 125th)' })],
      LGA: [lgaM60([0, 5])],
      EWR: [ewrNjtSubway('A', [25, 35], { lines: ['NJT', 'A', 'C'] })],
    },
  },
  {
    id: 'williamsburg',
    name: 'Williamsburg',
    hint: 'Bedford Ave · Domino Park',
    borough: 'Brooklyn',
    southOf96: false,
    crz: false,
    lat: 40.7144,
    lng: -73.9565,
    drive: { JFK: 30, LGA: 25, EWR: 45 },
    miles: { JFK: 12, LGA: 9, EWR: 17 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [jfkJZ([40, 55], { name: 'AirTrain + J train (Marcy Av)' }), jfkE([60, 75], { name: 'AirTrain + E + L train', lines: ['E', 'L'] })],
      LGA: [lgaQ70('E', [35, 50], { name: 'Q70 bus + E + L train', lines: ['E', 'L'] })],
      EWR: [ewrNjtSubway('L', [25, 35], { name: 'AirTrain + NJ Transit + L train (via 14th St)', lines: ['NJT', 'L'] })],
    },
  },
  {
    id: 'downtown-brooklyn',
    name: 'Downtown Brooklyn',
    hint: 'Barclays · Atlantic Terminal · Brooklyn Heights',
    borough: 'Brooklyn',
    southOf96: false,
    crz: false,
    lat: 40.6928,
    lng: -73.9903,
    drive: { JFK: 30, LGA: 30, EWR: 45 },
    miles: { JFK: 12, LGA: 11, EWR: 16 },
    uberShuttle: { JFK: true, LGA: true },
    transit: {
      JFK: [jfkA([45, 55], { name: 'AirTrain + A train (Jay St)' }), jfkLirr([15, 25], 'Atlantic Terminal', { name: 'AirTrain + LIRR to Atlantic Terminal', tips: ['Atlantic Terminal trains are less frequent than Penn trains — check TrainTime.', 'CityTicket covers Jamaica ↔ Atlantic Terminal.'] })],
      LGA: [lgaQ70('E', [40, 50], { name: 'Q70 bus + E + A/C train', lines: ['E', 'A', 'C'] })],
      EWR: [ewrNjtSubway('A', [25, 35], { lines: ['NJT', 'A', 'C'] }), ewrPath([30, 40], { name: 'AirTrain + NJ Transit + PATH + A train', legs: ['njt_ewr_newark_penn', 'path', 'subway'], lines: ['NJT', 'PATH', 'A'] })],
    },
  },
  {
    id: 'bushwick',
    name: 'Bushwick / Bed-Stuy',
    hint: 'Myrtle Ave · Jefferson St',
    borough: 'Brooklyn',
    southOf96: false,
    crz: false,
    lat: 40.6944,
    lng: -73.9213,
    drive: { JFK: 25, LGA: 25, EWR: 50 },
    miles: { JFK: 10, LGA: 9, EWR: 18 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [jfkJZ([30, 45], { name: 'AirTrain + J train (Myrtle/Broadway)' }), jfkA([35, 50], { name: 'AirTrain + A + C train', lines: ['A', 'C'] })],
      LGA: [lgaQ70('M', [35, 50], { name: 'Q70 bus + M train', lines: ['M'] })],
      EWR: [ewrNjtSubway('L', [30, 40], { lines: ['NJT', 'L'] })],
    },
  },
  {
    id: 'long-island-city',
    name: 'Long Island City',
    hint: 'Court Sq · Hunters Point',
    borough: 'Queens',
    southOf96: false,
    crz: false,
    lat: 40.7447,
    lng: -73.9485,
    drive: { JFK: 30, LGA: 15, EWR: 50 },
    miles: { JFK: 13, LGA: 5, EWR: 19 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [jfkE([35, 45], { name: 'AirTrain + E train (Court Sq)' }), jfkLirr([10, 20], 'Penn Station', { name: 'AirTrain + LIRR (Woodside) + 7', legs: ['airtrain_jfk', 'lirr_cityticket', 'subway'], lines: ['LIRR', '7'], time: [45, 65] })],
      LGA: [lgaQ70('7', [10, 15], { name: 'Q70 bus + 7 train' }), lgaQ70('E', [10, 15], { name: 'Q70 bus + E/M train', lines: ['E', 'M'] })],
      EWR: [ewrNjtSubway('E', [15, 25], { lines: ['NJT', 'E', '7'] })],
    },
  },
  {
    id: 'astoria',
    name: 'Astoria',
    hint: 'Ditmars · Steinway',
    borough: 'Queens',
    southOf96: false,
    crz: false,
    lat: 40.7644,
    lng: -73.9235,
    drive: { JFK: 30, LGA: 10, EWR: 50 },
    miles: { JFK: 13, LGA: 3, EWR: 20 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [jfkE([50, 65], { name: 'AirTrain + E + N/W train', lines: ['E', 'N', 'W'] })],
      LGA: [lgaM60([0, 5], { name: 'M60 SBS (Astoria Blvd stops)', time: [10, 25], steps: ['M60 SBS along Astoria Blvd (stops at Steinway, 31st St/N W)'] }), lgaQ70('E', [20, 30], { name: 'Q70 bus + N/W train', lines: ['N', 'W'] })],
      EWR: [ewrNjtSubway('N', [20, 30], { lines: ['NJT', 'N', 'W'] })],
    },
  },
  {
    id: 'flushing',
    name: 'Flushing',
    hint: 'Main St · Citi Field · USTA',
    borough: 'Queens',
    southOf96: false,
    crz: false,
    lat: 40.7596,
    lng: -73.83,
    drive: { JFK: 20, LGA: 15, EWR: 60 },
    miles: { JFK: 9, LGA: 5, EWR: 27 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [
        { id: 'jfk-airtrain-q44', name: 'AirTrain + Q44 SBS bus', legs: ['airtrain_jfk', 'subway'], lines: ['Q44'], time: [40, 60], steps: ['AirTrain to Jamaica', 'Q44 SBS north on Main St to Flushing'], tips: ['Q44 SBS: pay at the curb reader before boarding ($3.00).', 'Bus is traffic-exposed; rail via E + 7 is more predictable but longer.'], roadExposed: true },
        jfkE([45, 60], { name: 'AirTrain + E + 7 train', lines: ['E', '7'] }),
      ],
      LGA: [lgaQ70('7', [15, 20], { name: 'Q70 bus + 7 train (to Main St)' })],
      EWR: [ewrNjtSubway('7', [35, 50], { lines: ['NJT', '7'] })],
    },
  },
  {
    id: 'jamaica',
    name: 'Jamaica',
    hint: 'Jamaica Station · Jamaica Center',
    borough: 'Queens',
    southOf96: false,
    crz: false,
    lat: 40.6998,
    lng: -73.8081,
    drive: { JFK: 12, LGA: 25, EWR: 65 },
    miles: { JFK: 4, LGA: 10, EWR: 30 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [{ id: 'jfk-airtrain-only', name: 'AirTrain only', legs: ['airtrain_jfk'], lines: ['AirTrain'], time: [10, 18], steps: ['AirTrain to Jamaica station'], tips: ['Fare is paid on exit at Jamaica via OMNY.', 'Jamaica Center (E J Z) is one subway stop / 10-min walk from Jamaica station.'] }],
      LGA: [lgaQ70('E', [30, 40], { name: 'Q70 bus + E train (Jamaica Center)' })],
      EWR: [ewrNjtSubway('E', [45, 60], { lines: ['NJT', 'E'] })],
    },
  },
  {
    id: 'jersey-city',
    name: 'Jersey City / Hoboken',
    hint: 'Exchange Place · Newport · Hoboken Terminal',
    borough: 'New Jersey',
    southOf96: false,
    crz: false,
    lat: 40.7282,
    lng: -74.0776,
    drive: { JFK: 55, LGA: 45, EWR: 20 },
    miles: { JFK: 22, LGA: 16, EWR: 9 },
    uberShuttle: { JFK: false, LGA: false },
    transit: {
      JFK: [jfkE([55, 65], { name: 'AirTrain + E + PATH (from WTC)', legs: ['airtrain_jfk', 'subway', 'path'], lines: ['E', 'PATH'] })],
      LGA: [lgaQ70('E', [40, 50], { name: 'Q70 bus + E + PATH (from WTC)', legs: ['q70', 'subway', 'path'], lines: ['E', 'PATH'] })],
      EWR: [ewrPath([10, 20], { name: 'AirTrain + NJ Transit + PATH (Journal Sq / Exchange Pl / Hoboken)' })],
    },
  },
];

export const destinationById = Object.fromEntries(destinations.map((d) => [d.id, d]));
