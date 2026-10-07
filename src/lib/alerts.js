// Live MTA service alerts (GTFS-Realtime service-alerts JSON feeds).
// These feeds are public and keyless. In the browser they are fetched through
// the /api/mta/* rewrite (vercel.json / netlify.toml / vite dev proxy) to
// avoid CORS; a direct fetch is attempted as a fallback.
//
// Results are cached in localStorage so the last-known status is shown when
// offline, clearly marked stale. Nothing here is ever fabricated: if no feed
// loads, the UI says "live status unavailable".

const FEEDS = {
  subway: 'subway-alerts.json',
  lirr: 'lirr-alerts.json',
};
const MTA_BASE = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2F';
const CACHE_KEY = 'tripcompare.alerts.v1';
export const ALERT_TTL_MS = 2 * 60 * 1000;

async function fetchFeed(file) {
  const urls = [`/api/mta/${file}`, `${MTA_BASE}${file}`];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      if (!json?.entity) throw new Error('unexpected feed shape');
      return json;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('fetch failed');
}

function text(t) {
  const tr = t?.translation;
  if (!tr?.length) return '';
  return (tr.find((x) => x.language === 'en') ?? tr[0]).text ?? '';
}

function activeNow(alert, nowSec) {
  const periods = alert.active_period;
  if (!periods?.length) return true;
  return periods.some((p) => (p.start ?? 0) <= nowSec && (!p.end || p.end >= nowSec));
}

function severityOf(alert) {
  const type = (alert['transit_realtime.mercury_alert']?.alert_type ?? '').toLowerCase();
  const head = text(alert.header_text).toLowerCase();
  if (/suspend|no .*service|not running/.test(type + ' ' + head)) return 'red';
  if (/delay|slow|reroute|running with delays/.test(type + ' ' + head)) return 'red';
  if (/planned|service change|skip|local|express|detour|weekend/.test(type + ' ' + head)) return 'yellow';
  return 'yellow';
}

export function parseFeeds({ subway, lirr }, now = Date.now()) {
  const nowSec = Math.floor(now / 1000);
  const byLine = {};
  const push = (line, a) => {
    (byLine[line] ??= []).push(a);
  };
  for (const ent of subway?.entity ?? []) {
    const al = ent.alert;
    if (!al || !activeNow(al, nowSec)) continue;
    const item = { id: ent.id, header: text(al.header_text), body: text(al.description_text), severity: severityOf(al) };
    const routes = new Set((al.informed_entity ?? []).map((ie) => ie.route_id).filter(Boolean));
    for (const rt of routes) push(rt, item);
  }
  for (const ent of lirr?.entity ?? []) {
    const al = ent.alert;
    if (!al || !activeNow(al, nowSec)) continue;
    const item = { id: ent.id, header: text(al.header_text), body: text(al.description_text), severity: severityOf(al) };
    // LIRR route_ids are branch numbers; treat any LIRR alert as relevant to
    // the Jamaica ↔ Manhattan trunk unless it names a branch we don't use.
    const head = item.header.toLowerCase();
    const irrelevant = /montauk|greenport|oyster bay|port jefferson|ronkonkoma|west hempstead|far rockaway|long beach|hempstead|babylon|huntington|port washington/.test(head) && !/jamaica|penn|grand central|all branches|system/.test(head);
    if (!irrelevant) push('LIRR', item);
  }
  return byLine;
}

export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadAlerts() {
  const [subway, lirr] = await Promise.allSettled([fetchFeed(FEEDS.subway), fetchFeed(FEEDS.lirr)]);
  const ok = subway.status === 'fulfilled' || lirr.status === 'fulfilled';
  if (!ok) throw new Error('all feeds failed');
  const byLine = parseFeeds({ subway: subway.value, lirr: lirr.value });
  const result = {
    byLine,
    fetchedAt: Date.now(),
    partial: subway.status !== 'fulfilled' || lirr.status !== 'fulfilled',
    missing: [subway.status !== 'fulfilled' && 'subway', lirr.status !== 'fulfilled' && 'LIRR'].filter(Boolean),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    /* ignore quota */
  }
  return result;
}

/** Status for a set of lines: 'green' | 'yellow' | 'red' | 'unknown'. */
export function statusForLines(lines, alerts) {
  if (!alerts) return { color: 'unknown', items: [] };
  const covered = lines.filter((l) => /^[A-Z0-9]{1,2}$|^LIRR$/.test(l) && !/^(Q\d+|M60|NJT|PATH|AirTrain)$/.test(l));
  if (!covered.length) return { color: 'none', items: [] };
  const items = [];
  const seen = new Set();
  for (const l of covered)
    for (const a of alerts.byLine[l] ?? []) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      items.push({ ...a, line: l });
    }
  const color = items.some((i) => i.severity === 'red') ? 'red' : items.length ? 'yellow' : 'green';
  return { color, items };
}

const DEFAULT_BOARD_LINES = ['E', 'A', 'LIRR'];
/** Subway letters/numbers and LIRR used by the transit options on a trip, for the status board. */
export function boardLinesFor(options) {
  const ls = [...new Set(options.filter((o) => o.kind === 'transit').flatMap((o) => o.lines))].filter((l) => /^[A-Z0-9]$|^LIRR$/.test(l));
  return ls.length ? ls : DEFAULT_BOARD_LINES;
}
