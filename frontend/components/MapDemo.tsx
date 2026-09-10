'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api, getToken } from '../lib/api';

type Props = { mode?: 'gov' | 'citizen' };

type Row = Record<string, any>;

const riskColors: Record<string, string> = {
  SAFE: '#2e7d32', LOW: '#2e7d32', MODERATE: '#d69e00', HIGH: '#d97706', CRITICAL: '#b42318',
};
const roadColors: Record<string, string> = {
  OPEN: '#16803c', AT_RISK: '#d69e00', RESTRICTED: '#ea580c', BLOCKED: '#b42318',
};

// Keyless demo GIS data keeps the map useful even before the backend is connected.
const DEMO_ZONES: Row[] = [
  { id: 'z1', name: 'East Khasi Hills', lat: 25.56, lon: 91.89, risk_level: 'CRITICAL', risk_score: 88 },
  { id: 'z2', name: 'Dima Hasao', lat: 25.47, lon: 93.02, risk_level: 'HIGH', risk_score: 74 },
  { id: 'z3', name: 'West Sikkim', lat: 27.32, lon: 88.22, risk_level: 'HIGH', risk_score: 69 },
  { id: 'z4', name: 'Aizawl', lat: 23.73, lon: 92.72, risk_level: 'MODERATE', risk_score: 52 },
  { id: 'z5', name: 'Imphal West', lat: 24.82, lon: 93.93, risk_level: 'LOW', risk_score: 34 },
];
const DEMO_ROADS: Row[] = [
  { id: 'r1', name: 'NH-715', lat: 25.56, lon: 91.89, status: 'AT_RISK' },
  { id: 'r2', name: 'NH-6 Corridor', lat: 25.48, lon: 93.00, status: 'BLOCKED' },
  { id: 'r3', name: 'NH-10', lat: 27.31, lon: 88.25, status: 'RESTRICTED' },
  { id: 'r4', name: 'Aizawl–Champhai Road', lat: 23.73, lon: 92.72, status: 'OPEN' },
];
const DEMO_PLACES: Row[] = [
  { id: 'p1', name: 'Shillong Safe Shelter', lat: 25.57, lon: 91.88, kind: 'SHELTER' },
  { id: 'p2', name: 'Dima Hasao Relief Centre', lat: 25.47, lon: 93.04, kind: 'RELIEF' },
  { id: 'p3', name: 'Aizawl District Hospital', lat: 23.73, lon: 92.72, kind: 'HOSPITAL' },
  { id: 'p4', name: 'Imphal Emergency Centre', lat: 24.82, lon: 93.94, kind: 'POLICE' },
];
const DEMO_REPORTS: Row[] = [
  { id: 'rp1', name: 'Reported Cracks', lat: 25.58, lon: 91.91, verification_status: 'PENDING', hazard_type: 'CRACK' },
  { id: 'rp2', name: 'Recent Landslide', lat: 25.46, lon: 93.01, verification_status: 'VERIFIED', hazard_type: 'LANDSLIDE' },
  { id: 'rp3', name: 'Slope Movement', lat: 27.33, lon: 88.23, verification_status: 'PENDING', hazard_type: 'SLOPE_MOVEMENT' },
];

const geoPoint = (rows: Row[]) => ({
  type: 'FeatureCollection',
  features: rows.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon))).map(r => ({
    type: 'Feature', properties: r, geometry: { type: 'Point', coordinates: [Number(r.lon), Number(r.lat)] },
  })),
});

const geoRoad = (rows: Row[]) => ({
  type: 'FeatureCollection',
  features: rows.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon))).map(r => ({
    type: 'Feature', properties: r,
    geometry: { type: 'LineString', coordinates: [[Number(r.lon) - .10, Number(r.lat) - .055], [Number(r.lon), Number(r.lat)], [Number(r.lon) + .10, Number(r.lat) + .055]] },
  })),
});

export default function MapDemo({ mode = 'gov' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [zones, setZones] = useState<Row[]>(DEMO_ZONES);
  const [roads, setRoads] = useState<Row[]>(DEMO_ROADS);
  const [places, setPlaces] = useState<Row[]>(DEMO_PLACES);
  const [reports, setReports] = useState<Row[]>(DEMO_REPORTS);
  const [selected, setSelected] = useState<Row | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [layers, setLayers] = useState({ risk: true, roads: true, places: true, reports: true });

  const zoneGeo = useMemo(() => geoPoint(zones), [zones]);
  const roadGeo = useMemo(() => geoRoad(roads), [roads]);
  const placeGeo = useMemo(() => geoPoint(places), [places]);
  const reportGeo = useMemo(() => geoPoint(reports), [reports]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const token = getToken(mode === 'gov' ? 'gov' : 'citizen');
      if (!token) return;
      try {
        const [z, r, p, rp] = await Promise.all([
          api('/api/v1/zones'), api('/api/v1/roads'), api('/api/v1/places'), api('/api/v1/reports'),
        ]);
        if (cancelled) return;
        if (Array.isArray(z) && z.length) setZones(z);
        if (Array.isArray(r) && r.length) setRoads(r);
        if (Array.isArray(p) && p.length) setPlaces(p);
        if (Array.isArray(rp) && rp.length) setReports(rp.filter((x: Row) => x.lat != null && x.lon != null));
      } catch (e) {
        console.warn('PATKAI GIS API unavailable; showing built-in demonstration GIS data.', e);
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [mode]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    // No API key, account, or environment variable is required for this basemap.
    const style = {
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster' as const, source: 'osm', paint: { 'raster-opacity': 1 } }],
    };

    const map = new maplibregl.Map({
      container: container.current,
      style,
      center: [93.5, 25.8], zoom: 5.5, minZoom: 4, maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('error', (e: any) => {
      console.error('Basemap error', e);
      setMapError('Basemap tiles could not be loaded. The PATKAI overlay data is still available.');
    });
    map.on('load', () => {
      setReady(true);
      map.addSource('risk', { type: 'geojson', data: zoneGeo as any });
      map.addSource('roads', { type: 'geojson', data: roadGeo as any });
      map.addSource('places', { type: 'geojson', data: placeGeo as any });
      map.addSource('reports', { type: 'geojson', data: reportGeo as any });

      map.addLayer({ id: 'risk-halos', type: 'circle', source: 'risk', paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'risk_score'], 0, 18, 50, 32, 100, 48],
        'circle-color': ['match', ['get', 'risk_level'], 'CRITICAL', riskColors.CRITICAL, 'HIGH', riskColors.HIGH, 'MODERATE', riskColors.MODERATE, 'LOW', riskColors.LOW, riskColors.SAFE],
        'circle-opacity': .18, 'circle-stroke-opacity': .45, 'circle-stroke-width': 1,
      } });
      map.addLayer({ id: 'risk-points', type: 'circle', source: 'risk', paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'risk_score'], 0, 6, 50, 9, 100, 14],
        'circle-color': ['match', ['get', 'risk_level'], 'CRITICAL', riskColors.CRITICAL, 'HIGH', riskColors.HIGH, 'MODERATE', riskColors.MODERATE, 'LOW', riskColors.LOW, riskColors.SAFE],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
      } });
      map.addLayer({ id: 'road-lines', type: 'line', source: 'roads', paint: {
        'line-color': ['match', ['get', 'status'], 'BLOCKED', roadColors.BLOCKED, 'RESTRICTED', roadColors.RESTRICTED, 'AT_RISK', roadColors.AT_RISK, roadColors.OPEN],
        'line-width': 5, 'line-opacity': .9,
      } });
      map.addLayer({ id: 'place-points', type: 'circle', source: 'places', paint: {
        'circle-radius': 7, 'circle-color': ['match', ['get', 'kind'], 'SHELTER', '#1769aa', 'HOSPITAL', '#7c3aed', 'POLICE', '#334155', 'FIRE', '#dc2626', '#0f766e'],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
      } });
      map.addLayer({ id: 'report-points', type: 'circle', source: 'reports', paint: {
        'circle-radius': 7, 'circle-color': ['match', ['get', 'verification_status'], 'VERIFIED', '#15803d', 'SUSPICIOUS', '#b42318', '#d97706'],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
      } });

      const click = (e: any) => { const f = e.features?.[0]; if (f) setSelected(f.properties || {}); };
      ['risk-points', 'road-lines', 'place-points', 'report-points'].forEach(id => {
        map.on('click', id, click);
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const updates: [string, any][] = [['risk', zoneGeo], ['roads', roadGeo], ['places', placeGeo], ['reports', reportGeo]];
    updates.forEach(([id, data]) => { const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined; source?.setData(data as any); });
  }, [zoneGeo, roadGeo, placeGeo, reportGeo, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visibility: [string, boolean][] = [
      ['risk-halos', layers.risk], ['risk-points', layers.risk], ['road-lines', layers.roads], ['place-points', layers.places], ['report-points', layers.reports],
    ];
    visibility.forEach(([id, show]) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none'); });
  }, [layers, ready]);

  return (
    <div className="map-wrap">
      <div ref={container} className="map-canvas" aria-label="PATKAI regional GIS map" />
      <div className="map-panel map-panel-left">
        <strong>{mode === 'gov' ? 'Operational GIS Map' : 'Safety Map'}</strong>
        <div className="muted">Live PATKAI overlays · keyless OpenStreetMap basemap</div>
        <div className="map-controls">
          {([['risk', 'Risk Zones'], ['roads', 'Road Status'], ['places', 'Shelters & Services'], ['reports', 'Reports']] as const).map(([key, label]) => (
            <button key={key} className={`map-toggle ${layers[key] ? 'selected' : ''}`} onClick={() => setLayers(v => ({ ...v, [key]: !v[key] }))}>{label}</button>
          ))}
          <button className="map-toggle" onClick={() => mapRef.current?.fitBounds([[88.0, 21.5], [97.5, 29.5]], { padding: 40, duration: 700 })}>Fit NER</button>
        </div>
      </div>
      <div className="map-legend">
        <span><i className="critical" /> Critical</span><span><i className="high" /> High</span><span><i className="moderate" /> Moderate</span><span><i className="low" /> Low</span>
        <span>Roads: green open · orange risk · red blocked</span>
      </div>
      {!ready && !mapError && <div className="map-panel loading-card">Loading regional basemap…</div>}
      {mapError && <div className="map-error">{mapError}</div>}
      {selected && (
        <div className="map-popup">
          <button className="popup-close" onClick={() => setSelected(null)}>×</button>
          <strong>{selected.name || selected.hazard_type || selected.kind || 'Map feature'}</strong>
          {selected.risk_level && <div className="popup-risk">{selected.risk_score ?? '—'}<small>/100 risk</small></div>}
          <div className="muted">{selected.risk_level || selected.status || selected.verification_status || selected.kind || 'PATKAI feature'}</div>
          {selected.lat != null && selected.lon != null && <div className="map-note">{Number(selected.lat).toFixed(4)}°, {Number(selected.lon).toFixed(4)}°</div>}
        </div>
      )}
    </div>
  );
}
