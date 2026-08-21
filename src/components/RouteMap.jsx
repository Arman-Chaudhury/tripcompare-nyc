import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrafficCone, ExternalLink } from 'lucide-react';
import { roadRoutes, navLinks, wazeEmbed } from '../lib/geo.js';
import { driveRange } from '../lib/traffic.js';
import { fmtRange, fmtMin } from '../lib/timeValue.js';

// Apple-Maps-style palette: selected route blue with white casing, alternates gray.
const BLUE = '#0a84ff', BLUE_CASING = '#ffffff', GRAY = '#8e8e93';
const LINE_COLORS = { A: '#0039a6', C: '#0039a6', E: '#0039a6', B: '#ff6319', D: '#ff6319', F: '#ff6319', M: '#ff6319', J: '#996633', Z: '#996633', L: '#a7a9ac', N: '#fccc0a', Q: '#fccc0a', R: '#fccc0a', W: '#fccc0a', 1: '#ee352e', 2: '#ee352e', 3: '#ee352e', 4: '#00933c', 5: '#00933c', 6: '#00933c', 7: '#b933ad', LIRR: '#0f61a9', NJT: '#e87511', PATH: '#d93a8d', M60: '#00add0', Q44: '#00add0' };

const pin = (color, label) => L.divIcon({ className: 'pin', html: `<span style="background:${color}">${label}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
const stationIcon = L.divIcon({ className: 'station', html: '<span></span>', iconSize: [10, 10], iconAnchor: [5, 5] });

function FitBounds({ points }) {
  const map = useMap();
  const key = points.length ? `${points.length}:${points[0]}:${points[points.length - 1]}` : '';
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function RouteMap({ origin, destination, options, profile, selectedId, onSelect, routeIndex, onRouteChange, onRoutesLoaded, t }) {
  const [routes, setRoutes] = useState(null);
  const [failed, setFailed] = useState(false);
  const [traffic, setTraffic] = useState(false);
  const o = [origin.lat, origin.lng], d = [destination.lat, destination.lng];

  useEffect(() => {
    let alive = true;
    setRoutes(null); setFailed(false);
    roadRoutes(origin, destination)
      .then((rs) => { if (!alive) return; setRoutes(rs); onRoutesLoaded?.(rs); })
      .catch(() => { if (!alive) return; setFailed(true); onRoutesLoaded?.(null); });
    return () => { alive = false; };
  }, [origin.lat, origin.lng, destination.lat, destination.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const transitPaths = useMemo(
    () => options.filter((x) => x.kind === 'transit' && x.via?.length).map((x) => ({ opt: x, path: [o, ...(x.reversed ? [...x.via].reverse() : x.via), d], color: LINE_COLORS[x.lines.find((l) => LINE_COLORS[l])] ?? '#0b2a4a' })),
    [options, origin, destination], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const roadOpts = options.filter((x) => ['taxi', 'rideshare', 'carservice', 'shuttle'].includes(x.kind));
  const selected = options.find((x) => x.id === selectedId);
  const roadSelected = !selected || roadOpts.some((x) => x.id === selected.id);
  const primary = routes?.[routeIndex] ?? routes?.[0] ?? null;
  const allPts = useMemo(() => [o, d, ...transitPaths.flatMap((p) => p.path), ...(primary?.coords ?? [])], [o, d, transitPaths, primary]); // eslint-disable-line react-hooks/exhaustive-deps
  const links = navLinks(origin, destination);

  return (
    <section className="panel map-panel" aria-label={t('viewMap')}>
      <MapContainer center={o} zoom={11} scrollWheelZoom={false} className="map" attributionControl>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={allPts} />

        {/* Alternate driving routes (gray), drawn first so the primary sits on top */}
        {routes?.map((rt, i) => i !== (routeIndex ?? 0) && (
          <Polyline key={rt.id} positions={rt.coords} pathOptions={{ color: GRAY, weight: 5, opacity: roadSelected ? 0.8 : 0.3 }} eventHandlers={{ click: () => onRouteChange(i) }}>
            <Popup><strong>{rt.via ? t('via', { road: rt.via }) : `${t('routes')} ${i + 1}`}</strong><br />{rt.miles.toFixed(1)} mi · {fmtMin(driveRange(rt.freeFlowMin, profile))}</Popup>
          </Polyline>
        ))}
        {/* Primary driving route: white casing + blue */}
        {primary && (
          <>
            <Polyline positions={primary.coords} pathOptions={{ color: BLUE_CASING, weight: 9, opacity: roadSelected ? 1 : 0.3 }} />
            <Polyline positions={primary.coords} pathOptions={{ color: BLUE, weight: 6, opacity: roadSelected ? 1 : 0.3 }} eventHandlers={{ click: () => onSelect(roadOpts[0]?.id) }}>
              <Popup>
                <strong>{primary.via ? t('via', { road: primary.via }) : t('routes')}</strong>
                <br />{primary.miles.toFixed(1)} mi · {fmtMin(driveRange(primary.freeFlowMin, profile))}
                <br /><span className="muted">{roadOpts.map((x) => x.name).join(' · ')}</span>
              </Popup>
            </Polyline>
          </>
        )}
        {failed && <Polyline positions={[o, d]} pathOptions={{ color: GRAY, weight: 4, dashArray: '6 8' }} />}

        {transitPaths.map(({ opt, path, color }) => {
          const isSel = selectedId === opt.id;
          return (
            <Polyline key={opt.id} positions={path} pathOptions={{ color, weight: isSel ? 6 : 4, opacity: selected && !isSel ? 0.3 : 0.9, dashArray: '8 8' }} eventHandlers={{ click: () => onSelect(opt.id) }}>
              <Popup><strong>{opt.name}</strong><br />{fmtRange(opt.cost)} · {fmtMin(opt.time)}</Popup>
            </Polyline>
          );
        })}
        {transitPaths.flatMap(({ opt, path }) => path.slice(1, -1).map((p, i) => <Marker key={`${opt.id}-${i}`} position={p} icon={stationIcon} />))}
        <Marker position={o} icon={pin('#0b2a4a', 'A')}><Popup>{origin.name}</Popup></Marker>
        <Marker position={d} icon={pin('#b42318', 'B')}><Popup>{destination.name}</Popup></Marker>
      </MapContainer>

      <div className="map-under">
        {routes && routes.length > 0 && (
          <div className="routes">
            <span className="label">{t('routes')}</span>
            <div className="route-list" role="radiogroup" aria-label={t('routes')}>
              {routes.map((rt, i) => {
                const on = i === (routeIndex ?? 0);
                const fastest = routes.every((r2) => rt.freeFlowMin <= r2.freeFlowMin);
                return (
                  <button key={rt.id} type="button" role="radio" aria-checked={on} className={`route-chip ${on ? 'on' : ''}`} onClick={() => onRouteChange(i)}>
                    <span className="swatch" style={{ borderColor: on ? BLUE : GRAY }} />
                    <span>
                      <strong>{rt.via ? t('via', { road: rt.via }) : `${t('routes')} ${i + 1}`}</strong>
                      {fastest && routes.length > 1 && <span className="tag tag-strong">{t('fastestRoute')}</span>}
                      <br /><span className="muted small">{t('routeTime', { mi: rt.miles.toFixed(1), time: fmtMin(driveRange(rt.freeFlowMin, profile)) })}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="muted tiny">{t('roadModes')}</p>
          </div>
        )}
        {failed && <p className="muted small">{t('noRoutes')}</p>}

        {transitPaths.length > 0 && (
          <div className="routes">
            <span className="label">{t('transitRoutes')}</span>
            <div className="map-legend">
              {transitPaths.map(({ opt, color }) => (
                <button key={opt.id} type="button" className={`legend-item ${selectedId === opt.id ? 'on' : ''}`} onClick={() => onSelect(opt.id)}>
                  <span className="swatch dashed" style={{ borderColor: color }} /> {opt.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="traffic-row">
          <button type="button" className={`btn btn-ghost ${traffic ? 'on' : ''}`} aria-pressed={traffic} onClick={() => setTraffic((v) => !v)}>
            <TrafficCone size={16} aria-hidden="true" /> {traffic ? t('liveTrafficOn') : t('liveTraffic')}
          </button>
          <div className="nav-links">
            {[['Waze', links.waze], ['Apple Maps', links.apple], ['Google Maps', links.google]].map(([name, href]) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer">{t('openIn', { app: name })} <ExternalLink size={11} aria-hidden="true" /></a>
            ))}
          </div>
        </div>
        {traffic && (
          <div className="traffic">
            <p className="muted small">{t('liveTrafficNote')}</p>
            <iframe title="Waze live traffic" src={wazeEmbed(origin, destination)} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
        <p className="muted tiny">{t('mapLegend')} {t('selectOnMap')}</p>
      </div>
    </section>
  );
}
