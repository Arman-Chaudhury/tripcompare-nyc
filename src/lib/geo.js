// Places, geocoding, and distance helpers.
//
// A "place" is { kind: 'airport' | 'preset' | 'custom', id, name, lat, lng }.
// Custom addresses are geocoded with OpenStreetMap Nominatim (free, keyless,
// CORS-enabled; usage policy: light volume + attribution, both honored here).

import { airports, destinations, destinationById } from '../data/destinations.js';

export const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Bias box (not a hard limit) covering the whole tri-state catchment — all of
// Long Island and Connecticut, the Hudson Valley, New Jersey, and eastern PA —
// so "Broadway" means the right Broadway but Stamford and Montauk still match.
const VIEWBOX = '-75.6,42.2,-71.7,39.4';

export function airportPlace(code) {
  const a = airports[code];
  return { kind: 'airport', id: code, name: `${a.code} — ${a.name}`, lat: a.lat, lng: a.lng };
}
export function presetPlace(id) {
  const d = destinationById[id];
  return { kind: 'preset', id, name: d.name, lat: d.lat, lng: d.lng };
}
export const presetPlaces = () => destinations.map((d) => presetPlace(d.id));
export const airportPlaces = () => Object.keys(airports).map(airportPlace);

// URL form of a place: an airport code, a preset id, or "lat,lng,name" for a
// custom address. Shared by every tab so links reproduce the same trip.
export function placeFromParam(v, fallback) {
  if (!v) return fallback;
  if (airports[v]) return airportPlace(v);
  if (destinationById[v]) return presetPlace(v);
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(.*))?$/.exec(v);
  if (m) {
    let name = `${m[1]}, ${m[2]}`;
    if (m[3]) { try { name = decodeURIComponent(m[3]); } catch { name = m[3]; } }
    return { kind: 'custom', id: `pt-${m[1]},${m[2]}`, name, lat: +m[1], lng: +m[2] };
  }
  return fallback;
}
export const placeToParam = (p) => (p.kind === 'custom' ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${encodeURIComponent(p.name)}` : p.id);

export function haversineMiles(a, b) {
  const R = 3958.8;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Straight-line → road miles and free-flow minutes for arbitrary points. */
export function estimateRoad(a, b) {
  const straight = haversineMiles(a, b);
  const miles = Math.max(1, +(straight * 1.3).toFixed(1));
  const mph = miles < 4 ? 16 : miles < 10 ? 22 : 28; // free-flow average incl. local streets
  return { miles, freeFlowMin: Math.round((miles / mph) * 60) };
}

/** Nearest airport / preset neighborhood to a point, with distance. */
export function nearest(place, list) {
  let best = null;
  for (const p of list) {
    const d = haversineMiles(place, p);
    if (!best || d < best.miles) best = { place: p, miles: d };
  }
  return best;
}

// ─── Address search ─────────────────────────────────────────────────────────
// Primary: NYC Planning Labs GeoSearch (Pelias over the city's official
// address file — understands Queens hyphenated numbers like "41-11 95 St",
// intersections, and landmarks; keyless, CORS-open, fast autocomplete).
// Alongside it: Nominatim for everything outside the five boroughs — Long
// Island, Connecticut, Westchester / Hudson Valley, New Jersey, and beyond.
// Both run in parallel; NYC matches are listed first, then the rest.
export const GEOSEARCH = 'https://geosearch.planninglabs.nyc/v2/autocomplete';

export function normalizeQuery(q) {
  const SUF = '(street|avenue|ave|av|road|blvd|boulevard|pl|place|dr|drive|ln|lane|pkwy|parkway)';
  return q
    .trim()
    .replace(/\s+/g, ' ')
    // "95thst" → "95th st"
    .replace(new RegExp(`(\\d+)(st|nd|rd|th)${SUF}\\b`, 'gi'), '$1$2 $3')
    // "95street" / "41ave" → "95 street" / "41 ave"
    .replace(new RegExp(`(\\d+)${SUF}\\b`, 'gi'), '$1 $2')
    // "95st" / "108rd" at the end of the query or before a comma → "95 st" (not an ordinal like "23rd st")
    .replace(/(\d+)(st|rd)(?=\s*(,|$))/gi, '$1 $2')
    // "41 11 95 st" → "41-11 95 st" (Queens hyphen typed as a space)
    .replace(/^(\d{1,3}) (\d{1,3}) (?=\d)/, '$1-$2 ');
}

async function geosearch(q, signal) {
  const url = `${GEOSEARCH}?text=${encodeURIComponent(q)}&size=7`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geosearch ${res.status}`);
  const j = await res.json();
  return (j.features ?? []).map((f) => {
    const pr = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const name = pr.name || pr.label.split(',')[0];
    const area = pr.borough || pr.locality || pr.neighbourhood || '';
    return { kind: 'custom', id: `nyc-${pr.id ?? pr.gid ?? `${lat},${lng}`}`, name: area ? `${titleCase(name)}, ${area}` : titleCase(name), full: titleCase(pr.label), lat, lng };
  });
}

function titleCase(s) {
  return s.replace(/\b([A-Z]{2,})\b/g, (w) => (w === 'NY' || w === 'USA' || w === 'NYC' ? w : w[0] + w.slice(1).toLowerCase()));
}

// Short "name, town ST" label from Nominatim's address parts; the full
// display_name is kept as the secondary line.
function nominatimName(r, { preferStreet = false } = {}) {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const poi = r.name && r.name !== street ? r.name : '';
  const head = (preferStreet ? street || poi : poi || street) || r.display_name.split(',')[0];
  const town = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || '';
  const state = STATE_ABBR[a.state] ?? a.state ?? '';
  const tail = [town !== head ? town : '', state].filter(Boolean).join(', ');
  return tail ? `${head}, ${tail}` : head;
}

const STATE_ABBR = { 'New York': 'NY', 'New Jersey': 'NJ', Connecticut: 'CT', Pennsylvania: 'PA', Massachusetts: 'MA', 'Rhode Island': 'RI', Delaware: 'DE' };

// Nominatim reads a trailing "CT" as "Court" and "PA" as nothing useful, so
// spell out tri-state postal abbreviations before sending the query.
const STATE_NAME = Object.fromEntries(Object.entries(STATE_ABBR).map(([name, abbr]) => [abbr, name]));
function expandStates(q) {
  return q.replace(/,?\s+(NY|NJ|CT|PA|MA|RI|DE)(?=\s*(,|\d{5}|$))/i, (m, abbr) => `, ${STATE_NAME[abbr.toUpperCase()]}`);
}

async function nominatim(q, signal) {
  const params = new URLSearchParams({
    q: expandStates(q), format: 'jsonv2', addressdetails: '1', limit: '7', countrycodes: 'us', viewbox: VIEWBOX, bounded: '0', dedupe: '1',
  });
  const res = await fetch(`${NOMINATIM}?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const j = await res.json();
  return j.map((r) => ({
    kind: 'custom',
    id: `osm-${r.osm_type?.[0] ?? ''}${r.osm_id ?? r.place_id}`,
    name: nominatimName(r),
    full: r.display_name,
    lat: +r.lat,
    lng: +r.lon,
  }));
}

// Two same-named hits closer than this are one place (GeoSearch and OSM both
// know Penn Station; OSM often has the building, the stop, and the entrance).
const DUPE_MI = 0.2;
const sameName = (a, b) => a.name.split(',')[0].toLowerCase() === b.name.split(',')[0].toLowerCase();

export async function geocode(query, signal) {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const swallow = (e) => { if (e.name === 'AbortError') throw e; return []; };
  const [nyc, osm] = await Promise.all([
    geosearch(q, signal).catch(swallow),
    nominatim(q, signal).catch(swallow),
  ]);
  const out = [...nyc];
  for (const r of osm) {
    if (!out.some((p) => haversineMiles(p, r) < DUPE_MI && (sameName(p, r) || haversineMiles(p, r) < 0.05))) out.push(r);
  }
  return out.slice(0, 8);
}

export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`https://geosearch.planninglabs.nyc/v2/reverse?point.lat=${lat}&point.lon=${lng}&size=1`);
    const j = await res.json();
    const f = j.features?.[0];
    // Outside the city GeoSearch degrades to a county/state/country hit; only trust a real NYC address.
    if (f?.properties.borough) return titleCase(f.properties.label.split(',').slice(0, 2).join(','));
  } catch { /* fall through */ }
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: 'jsonv2', addressdetails: '1', zoom: '18' });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { Accept: 'application/json' } });
    const r = await res.json();
    if (r?.display_name) return nominatimName(r, { preferStreet: true });
  } catch { /* fall through */ }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

const RECENTS_KEY = 'tc.recents.v1';
export function readRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'); } catch { return []; }
}
export function pushRecent(place) {
  if (place.kind !== 'custom') return;
  const list = [place, ...readRecents().filter((p) => p.id !== place.id)].slice(0, 6);
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// ─── Road routing (OSRM public demo server — free, keyless, light use) ────────
// Returns up to 3 routes (primary first), each with full geometry, distance,
// free-flow duration, and a "via …" summary. No live traffic: OSRM durations
// are free-flow; the app applies its time-of-day model on top.
const routeCache = new Map();
export async function roadRoutes(a, b) {
  const key = `${a.lat.toFixed(4)},${a.lng.toFixed(4)}|${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key);
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&alternatives=3&steps=true`;
  const p = fetch(url).then((r) => r.json()).then((j) => {
    const routes = (j.routes ?? []).map((rt, i) => ({
      id: `r${i}`,
      coords: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      miles: rt.distance / 1609.34,
      freeFlowMin: rt.duration / 60,
      via: rt.legs.map((l) => l.summary).filter(Boolean).join(', ') || null,
    }));
    if (!routes.length) throw new Error('no route');
    return routes;
  }).catch((e) => { routeCache.delete(key); throw e; });
  routeCache.set(key, p);
  return p;
}

/** Deep links for live, traffic-aware navigation in the apps that have it. */
export function navLinks(a, b) {
  return {
    waze: `https://waze.com/ul?ll=${b.lat},${b.lng}&navigate=yes`,
    apple: `https://maps.apple.com/?saddr=${a.lat},${a.lng}&daddr=${b.lat},${b.lng}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=driving`,
    googleTransit: `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=transit`,
  };
}
export function wazeEmbed(a, b) {
  const lat = (a.lat + b.lat) / 2, lon = (a.lng + b.lng) / 2;
  const span = Math.max(Math.abs(a.lat - b.lat), Math.abs(a.lng - b.lng));
  const zoom = span > 0.3 ? 10 : span > 0.15 ? 11 : 12;
  return `https://embed.waze.com/iframe?zoom=${zoom}&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&ct=livemap`;
}
