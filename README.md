# TripCompare NYC

**Every way from JFK, LGA, and EWR into the city — ranked by cost and time, with verified fares and live MTA alerts.**

🔗 **Live app:** **https://arman-chaudhury.github.io/tripcompare-nyc/** — installable PWA; the in-app QR code links here.

I'm a CS student in New York and I work at an airport. Every shift, travelers ask me some version of the same question: *"How much is a taxi to Midtown?" "Is the train faster?" "Which one should I take?"* I got tired of answering from memory with numbers that drift every time the MTA or TLC changes something, so I built the answer as a web app I can hand to anyone — or let them scan off my phone.

It's a single-purpose PWA: no login, no backend, no tracking. Pick your airport, pick a neighborhood or any address, and it lines up every realistic option — AirTrain + subway, AirTrain + LIRR, yellow cab (or Curb), **UberX, Lyft, and Revel as separate rows**, Carmel and Dial 7 car services, Uber's shared airport shuttle, Go Airlink vans, Blade helicopter, the free Q70, M60, NJ Transit, PATH, even Citi Bike from LaGuardia — with **cost, time, cost per mile, and cost per minute** side by side, for the time you're actually leaving.

---

## Features

- **Trip selector** — JFK / LGA / EWR and 14 preset neighborhoods (Midtown, Lower Manhattan, Chelsea/West Village, Upper East Side, Upper West Side, Harlem, Williamsburg, Downtown Brooklyn, Bushwick/Bed-Stuy, Long Island City, Astoria, Flushing, Jamaica, Jersey City/Hoboken) as presets for **both** origin and destination, plus **any address** via OpenStreetMap Nominatim search (free, keyless). Trips work in either direction (airport → city or city → airport) with a swap button; custom addresses snap to the nearest preset neighborhood for transit itineraries (with a last-mile adjustment) and use geometry for car estimates. Trips with no airport on either end show car modes only and say so.
- **Route map** — a Leaflet/OpenStreetMap map above every comparison, styled the way navigation apps do it: the selected driving route in blue with a white casing, **alternate routes in gray** (up to three from OSRM, each labeled "via …" with distance and a modeled time range for the chosen departure), and transit itineraries dashed in their official line colors. Pick a route and every car mode's cost and time re-computes from that route's distance. A/B pins; tap a row, card, chip, or line to highlight. Tiles and routes are cached for offline.
- **Live traffic** — a toggle embeds Waze's live traffic map for the trip area (jams, incidents, closures), plus one-tap **Open in Waze / Apple Maps / Google Maps** links for a live, traffic-aware ETA. The app's own time ranges use the time-of-day model, not live flow — Waze, Apple, and Google don't expose traffic data to third-party sites without paid keys, and the app never pretends otherwise.
- **Address search that handles NYC** — NYC Planning Labs GeoSearch (the city's own address data) is the primary geocoder, so Queens hyphenated numbers like `41-11 95 St`, intersections, and landmarks resolve on the first try; OpenStreetMap Nominatim covers NJ and beyond. 220 ms debounce, recent places, keyboard navigation, and a "use my location" button.
- **Transit-board layout** — a navy tab bar (Getting there · Canceled flight · Airports · Help a passenger; the last three are marked *soon*), a departure-board status strip with the New York clock and live MTA status for the lines on your trip, and one route bar for from/to, departure time, weather, and what your time is worth.
- **One-sentence answer first** — "AirTrain + LIRR to Penn Station. $14, about 54 min." plus the trade-off against the fastest and cheapest options, computed from the ranked results.
- **Comparison table** — one row per mode with official-style line bullets, cost (stamped *verified* or *estimate*), time, **cost per minute**, and a *good to know* column (live alert, warning, exact-price link, or top tip). Warnings shared by most rows (JFK construction) appear once above the table. Tap a row for steps, full cost breakdown, time-value math, and commuter projection.
- **"Leaving now" by default** (device clock), or pick a day and time. This drives LIRR peak/off-peak pricing, the taxi rush-hour and night surcharges, the traffic model, overnight-service warnings, and promo windows.
- **Ranked cards** sortable by *cheapest*, *fastest*, or *best value* (an adjustable "your time is worth $X/hr" slider).
- **Time-value metric and cost per minute on every row/card** — see below.
- **Traffic & delay modeling** — every car time is a range computed from free-flow drive time × a time-of-day multiplier, labeled with the assumption ("assumes weekday evening rush traffic (Thursday 5:12 PM)"). A weather toggle (rain/snow) widens road times and raises rideshare surge likelihood.
- **JFK construction banner** on every JFK road mode (the $19B redevelopment runs through ~2030), plus relocated Uber/Lyft pickup notes on the rideshare card.
- **Live MTA service alerts** — a colored status dot and alert text on every subway/LIRR card, refreshed every 2 minutes, cached for offline.
- **Expandable cards** with step-by-step directions, practical tips ("the Q70 is FREE", "buy your CityTicket in the TrainTime app", "AirTrain is paid on exit at Jamaica"), a full cost breakdown, and info notes.
- **Commuter projection** — weekly / monthly / yearly cost if you did this trip every workday.
- **CO₂ per trip** for every mode and **calories** for Citi Bike.
- **Share button** (Web Share API, clipboard fallback) and a **QR-code view** so a traveler can scan it straight off my phone or a printed card.
- **English + Spanish** UI, with a tiny i18n object that makes adding a language a one-file change.
- **Installable PWA**, works fully offline once opened — airports have terrible signal.
- **Accessibility** — large touch targets (≥44px), one-handed layout, visible focus states, ARIA roles on all controls, WCAG-AA contrast in light and dark mode (follows the system setting), `lang` attribute switches with the language.

## Cost per mile, cost per minute, and the time-value metric

Every row shows what each mode actually charges you for the distance and the time it takes: **$/mile** (trip cost ÷ road miles) and **$/minute** (trip cost ÷ door-to-door minutes), with the full range underneath. For JFK → Midtown on a weekday afternoon that reads roughly: AirTrain + E train $0.46/mi · $0.11/min; Uber shuttle $1.56/mi · $0.32/min; UberX $5.50/mi · $1.29/min; yellow cab $5.97/mi · $1.49/min; Blade $14/mi · $2.96/min. Same destination, a 30× spread in what a mile costs.

The time-value column goes one step further:

Price alone never answers "which is better?" — the real question is *what am I paying for the time I save?* So every card shows, relative to the cheapest option:

> **Yellow taxi** costs **$84 more** than the cheapest but saves **25 min** → you pay about **$200/hr** for that time.

and, for slower options, the inverse relative to the fastest:

> **AirTrain + E train** saves **$84** vs. the fastest for **25 extra min** → you earn back about **$200/hr** of your budget.

Midpoints of the cost and time ranges are used for the arithmetic. The "best value" sort minimizes `cost + (minutes / 60) × your hourly value`, which defaults to $25/hr and is adjustable with a slider — a consultant on an expense account and a student with a backpack get different answers, and both are right.

## Fare verification methodology

Fares don't change minute-to-minute; they change by announcement. So every fare lives in [`src/data/fares.js`](src/data/fares.js) and every entry carries:

```js
airtrain_jfk: {
  amount: 8.75,
  lastVerified: '2026-08-20',
  source: 'https://www.jfkairport.com/to-from-airport/air-train',
  promo: { label: 'Summer 50% off', amount: 4.40, start: '2026-06-01', end: '2026-09-04', ... },
}
```

- **`lastVerified`** is rendered in the footer of the app. That transparency *is* the credibility of the tool.
- **Seasonal promos are date-windowed.** `getFare()` returns the promo amount only inside the window and silently reverts afterward — the summer AirTrain discount expires on its own without a deploy.
- **Anything not verified against an official source is marked** `approximate: true` in the data (rendered with a `*` in the breakdown) and carries a `// TODO: verify` comment in the code. There are a handful of these — NJ Transit's one-stop Newark Penn ticket, Newark taxi zone fares, Citi Bike's classic unlock/day-pass prices — and the UI never presents them as verified.
- **Sanity checks** in [`scripts/sanity.mjs`](scripts/sanity.mjs) (`npm run check`) assert the headline route math: JFK → Manhattan via AirTrain + subway = $11.75 ($7.40 with the summer promo), AirTrain + LIRR = $14.00 off-peak / $16.00 peak, and that every airport-destination pair produces valid ranges.

## Honest live data

Passengers ask for live prices. Here is exactly what's live and what isn't, and the app labels every number accordingly:

| Data | Status | How |
|---|---|---|
| Uber / Lyft / Revel prices | **Estimate range → exact price one tap away** | Uber and Lyft shut down their public price-estimate APIs, and Revel never had one, so no third-party site can show their exact fare — any that claims to is guessing. This app never fakes it: each provider gets its own row with an estimate range by route and time of day, labeled *estimate — exact price in the app*, and an "Exact price in Uber/Lyft" button that deep-links into the app with pickup and destination pre-filled. The number the app shows you is the real one. |
| Car services, Blade, Go Airlink | **Published flat rates** | Carmel, Dial 7, Blade, and Go Airlink publish fixed prices, so those rows show the published rate (+ tolls/tip where applicable) and a Book link. They are marked approximate until re-verified on the operator's site. |
| MTA service alerts | **Live** | Fetched from the MTA's free, keyless GTFS-Realtime service-alerts JSON feeds (subway + LIRR). Parsed client-side, mapped to the lines on each card, refreshed every 2 min, cached in `localStorage` and shown as *stale* when offline. If the feed can't be reached, the card says so instead of pretending. |
| Fares | **Verified-static** | Every fare has a `lastVerified` date and official source; promos are date-windowed (see above). |
| Travel times | **Modeled ranges** | Free-flow drive time (OSRM route duration, or curated values) × time-of-day traffic multiplier; transit times are published-schedule ranges including typical waits. Never a single number. |
| Live traffic | **Live, via Waze embed + nav-app links** | Waze's public live map is embedded for the trip area so you can see jams right now; for a live ETA the trip opens in Waze / Apple Maps / Google Maps. There is no free programmatic traffic feed to fold into the model. |

Badges on every card: **Verified fare** (green), **Estimate** (amber), **Live alert** (red).

## Tech stack

- [Vite](https://vitejs.dev) + [React](https://react.dev) — single-page app, no router needed
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox) — manifest, service worker, precached app shell (which includes all fare data), network-first cache for MTA alerts
- [lucide-react](https://lucide.dev) — icons
- [`qrcode.react`](https://github.com/zpao/qrcode.react) — QR code view
- Plain CSS with custom properties — deliberately plain: white ground, one navy accent, tabular numerals
- [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org) with OpenStreetMap tiles for the route map; road geometry from the public [OSRM](http://project-osrm.org) demo server (light use; swap in your own OSRM/Valhalla host if traffic grows)
- [NYC GeoSearch](https://geosearch.planninglabs.nyc) (primary) and [Nominatim](https://nominatim.org) (fallback) for free-form address search — both keyless, Nominatim rate-limited client-side to 1 req/s per their usage policy; all attributed in the footer
- No backend. The `/api/mta/*` path is a pure rewrite (Vercel / Netlify / Vite dev proxy) to the MTA feed; the MTA also sends `Access-Control-Allow-Origin: *`, so the app falls back to a direct fetch if the rewrite isn't configured.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # fare/route-math sanity checks
npm run build      # production build → dist/ (includes sw.js + manifest)
npm run preview    # serve the production build locally
```

## Deploy

**GitHub Pages (current, automatic).** Every push to `main` runs `.github/workflows/deploy.yml`, which builds with `VITE_BASE=/tripcompare-nyc/` and publishes `dist/` to Pages. The MTA alerts feed sends `Access-Control-Allow-Origin: *`, so no proxy is needed there. The QR code and Share button always encode the public URL (override with `VITE_PUBLIC_URL`).

**Vercel / Netlify (alternatives, one command, free tier)**

**Vercel**

```bash
npm i -g vercel
vercel            # first time: link the project
npm run deploy:vercel
```

**Netlify**

```bash
npm i -g netlify-cli
netlify init      # first time: link the project
npm run build && npm run deploy:netlify
```

Both `vercel.json` and `netlify.toml` are included: SPA fallback, the MTA alerts rewrite, and `no-cache` on `sw.js` so updates roll out immediately. If you move hosts, set `VITE_PUBLIC_URL` to the new address so the QR code follows.

## Project layout

```
src/
  data/fares.js          every fare: amount, lastVerified, source, optional promo window
  data/destinations.js   airports, 14 destinations, transit itineraries per airport
  lib/geo.js             places, Nominatim geocoding, haversine / road-distance estimates
  lib/traffic.js         time-of-day traffic multipliers, LIRR peak rule, surge profile
  lib/options.js         builds every option for (airport, destination, time, weather)
  lib/timeValue.js       $/hr-saved metric, sorting, commuter projection
  lib/alerts.js          MTA GTFS-RT alerts fetch/parse/cache, per-line status
  lib/i18n.js            en + es strings
  components/            StatusBoard, RouteBar + PlacePicker, Verdict, CompareTable, ResultCard, RouteMap, ShareQR
scripts/sanity.mjs       route-math checks (npm run check)
```

## Fare sources (verified 2026-08-20)

| Fare | Amount | Source |
|---|---|---|
| JFK AirTrain | $8.75 (summer promo ≈ $4.40 through ~Sept 4, 2026) | [jfkairport.com](https://www.jfkairport.com/to-from-airport/air-train) |
| Newark AirTrain | $8.75 (included in NJ Transit ticket) | [newarkairport.com](https://www.newarkairport.com/to-from-airport/air-train) |
| Subway / local bus | $3.00 (OMNY only; MetroCard discontinued Jan 2026) | [new.mta.info/fares](https://new.mta.info/fares) |
| LIRR CityTicket | $5.25 off-peak / $7.25 peak | [new.mta.info](https://new.mta.info/fares/lirr-metro-north/cityticket) |
| Q70 LaGuardia Link | FREE | [laguardiaairport.com](https://www.laguardiaairport.com/to-from-airport/by-bus) |
| M60 SBS | $3.00 | [new.mta.info/fares](https://new.mta.info/fares) |
| PATH | $3.00 | [panynj.gov](https://www.panynj.gov/path/en/fares-and-passes.html) |
| NJ Transit EWR → Penn Station | ~$16.80 incl. AirTrain | [njtransit.com/airport](https://www.njtransit.com/airport) |
| NYC Ferry | $4.50 | [ferry.nyc](https://www.ferry.nyc/ticketing-info/) |
| Yellow cab JFK ↔ Manhattan | $70.00 flat + $5.00 rush (wkdy 4–8pm) + tolls/surcharges/tip | [nyc.gov/tlc](https://www.nyc.gov/site/tlc/passengers/taxi-fare.page) |
| Yellow cab meter | $3.00 initial, $0.70/unit, $2.50 rush, $1.00 night; +$5 LGA; +$20 to EWR | [nyc.gov/tlc](https://www.nyc.gov/site/tlc/passengers/taxi-fare.page) |
| Uber Airport Shuttle | $25 JFK / $18 LGA | [uber.com](https://www.uber.com/us/en/ride/airport-shuttle/) |
| UberX / Lyft / Revel JFK ↔ Manhattan | ~$60–110 estimate, exact price via deep link | — |
| Carmel car service JFK ↔ Manhattan | ~$62 flat + tolls/tip *(verify)* | [carmellimo.com](https://www.carmellimo.com/) |
| Dial 7 car service JFK ↔ Manhattan | ~$65 flat + tolls/tip *(verify)* | [dial7.com](https://www.dial7.com/) |
| Blade helicopter JFK ↔ Manhattan | ~$195/seat *(verify)* | [blade.com](https://www.blade.com/airport) |
| Go Airlink shared van | ~$25/person *(verify)* | [goairlinkshuttle.com](https://www.goairlinkshuttle.com/) |
| Citi Bike | e-bike $0.27/min; annual $239 | [citibikenyc.com/pricing](https://citibikenyc.com/pricing) |

Notes: NYC Ferry is in the fare table but no ferry serves an airport directly, so it isn't offered as a leg yet. Taxi and rideshare totals are ranges because tolls (route-dependent), tip, and traffic-time charges vary.

## Roadmap

- **Rideshare price partnerships** — if Uber/Lyft ever expose a price-estimate endpoint again (or an airport partnership makes one available), swap the estimate range for a genuine live quote without changing the UI contract.
- **GTFS trip-time routing** — replace hand-curated transit time ranges with real schedule-based routing (MTA GTFS static + GTFS-RT trip updates) so overnight and weekend service patterns are computed, not annotated.
- **More languages** — Chinese, Haitian Creole, Bengali, Russian, Korean reflect who actually walks through JFK; the i18n layer is ready, the strings aren't written yet. Route tips are English-only today.
- **Bus alerts + PATH/NJ Transit alerts** — currently only subway and LIRR feeds are consumed.
- **Weather from an API** instead of a manual toggle.
- **Cross-street search** ("23rd St & 8th Ave") — neither free geocoder resolves intersections today; NYC's Geoclient API does but needs a key.
- **Self-hosted routing** (OSRM/Valhalla) and transit geometry from GTFS shapes so transit lines follow the actual tracks instead of station-to-station segments.
- **Printable QR card** for the information desk.
- **React Native** if usage justifies a native app; the data and model layers are plain JS and would port unchanged.

## Disclaimer

Not affiliated with the MTA, Port Authority, TLC, Uber, or Lyft. Verified fares are exact on their verification date; estimates and travel times are ranges, never promises. No login, no tracking, no analytics.
