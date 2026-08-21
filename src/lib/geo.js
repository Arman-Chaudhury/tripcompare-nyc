// Places, geocoding, and distance helpers.
//
// A "place" is { kind: 'airport' | 'preset' | 'custom', id, name, lat, lng }.
// Custom addresses are geocoded with OpenStreetMap Nominatim (free, keyless,
// CORS-enabled; usage policy: light volume + attribution, both honored here).

import { airports, destinations, destinationById } from '../data/destinations.js';

export const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Bounding box around the NYC metro so "Broadway" means the right Broadway.
const VIEWBOX = '-74.45,41.05,-73.45,40.45';

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
// Fallback: Nominatim for anything outside the five boroughs (NJ, LI, etc.).
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

export async function geocode(query, signal) {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  try {
    const nyc = await geosearch(q, signal);
    if (nyc.length) return nyc;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
  }
  return nominatim(q, signal);
}

export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`https://geosearch.planninglabs.nyc/v2/reverse?point.lat=${lat}&point.lon=${lng}&size=1`);
    const j = await res.json();
    const f = j.features?.[0];
    if (f) return titleCase(f.properties.label.split(',').slice(0, 2).join(','));
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
