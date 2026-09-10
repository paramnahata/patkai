'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api, getToken } from '../lib/api';

type Props = {
  mode?: 'gov' | 'citizen';
};

const riskColors: Record<string, string> = {
  SAFE: '#2e7d32',
  LOW: '#2e7d32',
  MODERATE: '#d69e00',
  HIGH: '#d97706',
  CRITICAL: '#b42318',
};

const roadColors: Record<string, string> = {
  OPEN: '#16803c',
  AT_RISK: '#d69e00',
  RESTRICTED: '#ea580c',
  BLOCKED: '#b42318',
};

const placeLabels: Record<string, string> = {
  SHELTER: 'Shelter',
  HOSPITAL: 'Hospital',
  POLICE: 'Police',
  FIRE: 'Fire',
  RELIEF: 'Relief Centre',
};

export default function MapDemo({ mode = 'gov' }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [zones, setZones] = useState<any[]>([]);
  const [roads, setRoads] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [selected, setSelected] = useState<any>(null);

  const [layers, setLayers] = useState({
    risk: true,
    roads: true,
    places: true,
    reports: true,
  });

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  /*
   * Load PATKAI GIS data
   */
  const loadMapData = async () => {
    const tokenType = mode === 'gov' ? 'gov' : 'citizen';

    if (!getToken(tokenType)) {
      console.warn(`No ${tokenType} token available for map data`);
      return;
    }

    try {
      const [zonesData, roadsData, placesData, reportsData] =
        await Promise.all([
          api('/api/v1/zones'),
          api('/api/v1/roads'),
          api('/api/v1/places'),
          api('/api/v1/reports'),
        ]);

      setZones(Array.isArray(zonesData) ? zonesData : []);
      setRoads(Array.isArray(roadsData) ? roadsData : []);
      setPlaces(Array.isArray(placesData) ? placesData : []);

      const validReports = Array.isArray(reportsData)
        ? reportsData.filter(
            (report: any) =>
              report.lat !== undefined &&
              report.lat !== null &&
              report.lon !== undefined &&
              report.lon !== null
          )
        : [];

      setReports(validReports);
    } catch (error) {
      console.error('PATKAI map data loading failed:', error);
    }
  };

  /*
   * Periodically refresh risk / road / report information
   */
  useEffect(() => {
    loadMapData();

    const interval = window.setInterval(() => {
      loadMapData();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [mode]);

  /*
   * Convert PATKAI zones to GeoJSON
   */
  const zoneGeo = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: zones
        .filter(
          (zone: any) =>
            zone.lat !== undefined &&
            zone.lon !== undefined &&
            zone.lat !== null &&
            zone.lon !== null
        )
        .map((zone: any) => ({
          type: 'Feature',
          properties: zone,
          geometry: {
            type: 'Point',
            coordinates: [Number(zone.lon), Number(zone.lat)],
          },
        })),
    }),
    [zones]
  );

  /*
   * Convert roads to GeoJSON
   */
  const roadGeo = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: roads
        .filter(
          (road: any) =>
            road.lat !== undefined &&
            road.lon !== undefined &&
            road.lat !== null &&
            road.lon !== null
        )
        .map((road: any) => ({
          type: 'Feature',
          properties: road,
          geometry: {
            type: 'LineString',
            coordinates: [
              [
                Number(road.lon) - 0.035,
                Number(road.lat) - 0.018,
              ],
              [Number(road.lon), Number(road.lat)],
              [
                Number(road.lon) + 0.035,
                Number(road.lat) + 0.018,
              ],
            ],
          },
        })),
    }),
    [roads]
  );

  /*
   * Convert shelters / hospitals / services to GeoJSON
   */
  const placeGeo = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: places
        .filter(
          (place: any) =>
            place.lat !== undefined &&
            place.lon !== undefined &&
            place.lat !== null &&
            place.lon !== null
        )
        .map((place: any) => ({
          type: 'Feature',
          properties: place,
          geometry: {
            type: 'Point',
            coordinates: [
              Number(place.lon),
              Number(place.lat),
            ],
          },
        })),
    }),
    [places]
  );

  /*
   * Convert citizen / field reports to GeoJSON
   */
  const reportGeo = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: reports.map((report: any) => ({
        type: 'Feature',
        properties: report,
        geometry: {
          type: 'Point',
          coordinates: [
            Number(report.lon),
            Number(report.lat),
          ],
        },
      })),
    }),
    [reports]
  );

  /*
   * Initialize MapTiler + MapLibre
   */
  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    /*
     * IMPORTANT:
     * NEXT_PUBLIC_MAPTILER_KEY must exist in Vercel.
     */
    const maptilerKey =
      process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();

    if (!maptilerKey) {
      setMapError(
        'MapTiler API key is not configured. Add NEXT_PUBLIC_MAPTILER_KEY in Vercel and redeploy.'
      );
      return;
    }

    setMapError('');
    setMapReady(false);

    /*
     * Real MapTiler basemap.
     *
     * Using a string here intentionally avoids the
     * MapLibre StyleSpecification TypeScript issue.
     */
    const styleUrl =
      `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(
        maptilerKey
      )}`;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [93.5, 25.8],
      zoom: 5.8,
      minZoom: 4,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl(),
      'top-right'
    );

    map.addControl(
      new maplibregl.ScaleControl({
        unit: 'metric',
      }),
      'bottom-left'
    );

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    /*
     * MapTiler / MapLibre errors
     */
    map.on('error', (event: any) => {
      console.error('MapLibre error:', event);

      const message =
        event?.error?.message ||
        'Unable to load the map. Check your MapTiler key and allowed HTTP origins.';

      setMapError(`Map failed to load: ${message}`);
    });

    /*
     * Add PATKAI layers after basemap loads
     */
    map.on('load', () => {
      setMapReady(true);

      /*
       * Risk zones
       */
      map.addSource('risk', {
        type: 'geojson',
        data: zoneGeo as any,
      });

      /*
       * Roads
       */
      map.addSource('roads', {
        type: 'geojson',
        data: roadGeo as any,
      });

      /*
       * Shelters / emergency services
       */
      map.addSource('places', {
        type: 'geojson',
        data: placeGeo as any,
      });

      /*
       * Citizen / field reports
       */
      map.addSource('reports', {
        type: 'geojson',
        data: reportGeo as any,
      });

      /*
       * Road status
       */
      map.addLayer({
        id: 'road-lines',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': [
            'match',
            ['get', 'status'],
            'BLOCKED',
            roadColors.BLOCKED,
            'RESTRICTED',
            roadColors.RESTRICTED,
            'AT_RISK',
            roadColors.AT_RISK,
            roadColors.OPEN,
          ],
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });

      /*
       * Risk zone halo
       */
      map.addLayer({
        id: 'risk-halos',
        type: 'circle',
        source: 'risk',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0,
            18,
            50,
            30,
            100,
            46,
          ],

          'circle-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL',
            riskColors.CRITICAL,
            'HIGH',
            riskColors.HIGH,
            'MODERATE',
            riskColors.MODERATE,
            'LOW',
            riskColors.LOW,
            riskColors.SAFE,
          ],

          'circle-opacity': 0.16,

          'circle-stroke-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL',
            riskColors.CRITICAL,
            'HIGH',
            riskColors.HIGH,
            'MODERATE',
            riskColors.MODERATE,
            'LOW',
            riskColors.LOW,
            riskColors.SAFE,
          ],

          'circle-stroke-opacity': 0.35,
          'circle-stroke-width': 1,
        },
      });

      /*
       * Risk zone point
       */
      map.addLayer({
        id: 'risk-points',
        type: 'circle',
        source: 'risk',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0,
            6,
            50,
            9,
            100,
            14,
          ],

          'circle-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL',
            riskColors.CRITICAL,
            'HIGH',
            riskColors.HIGH,
            'MODERATE',
            riskColors.MODERATE,
            'LOW',
            riskColors.LOW,
            riskColors.SAFE,
          ],

          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });

      /*
       * Emergency places
       */
      map.addLayer({
        id: 'place-points',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': 6,

          'circle-color': [
            'match',
            ['get', 'kind'],
            'SHELTER',
            '#1769aa',
            'HOSPITAL',
            '#7c3aed',
            'POLICE',
            '#334155',
            'FIRE',
            '#dc2626',
            '#64748b',
          ],

          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });

      /*
       * Citizen reports
       */
      map.addLayer({
        id: 'report-points',
        type: 'circle',
        source: 'reports',
        paint: {
          'circle-radius': 7,

          'circle-color': [
            'match',
            ['get', 'verification_status'],
            'VERIFIED',
            '#15803d',
            'SUSPICIOUS',
            '#b42318',
            '#d97706',
          ],

          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });

      /*
       * Click handlers
       */
      const handleClick = (event: any) => {
        const feature = event.features?.[0];

        if (feature) {
          setSelected(feature.properties);
        }
      };

      const clickableLayers = [
        'risk-points',
        'road-lines',
        'place-points',
        'report-points',
      ];

      clickableLayers.forEach((layerId) => {
        map.on('click', layerId, handleClick);

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /*
   * Update GeoJSON whenever backend data changes
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    const riskSource = map.getSource('risk') as
      | maplibregl.GeoJSONSource
      | undefined;

    if (riskSource) {
      riskSource.setData(zoneGeo as any);
    }

    const roadsSource = map.getSource('roads') as
      | maplibregl.GeoJSONSource
      | undefined;

    if (roadsSource) {
      roadsSource.setData(roadGeo as any);
    }

    const placesSource = map.getSource('places') as
      | maplibregl.GeoJSONSource
      | undefined;

    if (placesSource) {
      placesSource.setData(placeGeo as any);
    }

    const reportsSource = map.getSource('reports') as
      | maplibregl.GeoJSONSource
      | undefined;

    if (reportsSource) {
      reportsSource.setData(reportGeo as any);
    }
  }, [
    zoneGeo,
    roadGeo,
    placeGeo,
    reportGeo,
    mapReady,
  ]);

  /*
   * Show / hide map layers
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    const visibilityMap = [
      ['risk-halos', layers.risk],
      ['risk-points', layers.risk],
      ['road-lines', layers.roads],
      ['place-points', layers.places],
      ['report-points', layers.reports],
    ] as const;

    visibilityMap.forEach(([layerId, visible]) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          visible ? 'visible' : 'none'
        );
      }
    });
  }, [layers, mapReady]);

  /*
   * Center map on selected place
   */
  const flyToLocation = (
    lat: number,
    lon: number
  ) => {
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: 11,
      duration: 700,
    });
  };

  return (
    <div className="map-wrap">
      <div
        ref={mapContainer}
        className="map-canvas"
      />

      {mapError && (
        <div className="map-error">
          {mapError}
        </div>
      )}

      <div className="map-panel map-panel-left">
        <b>
          {mode === 'citizen'
            ? 'Nearby Hazard Map'
            : 'Operational GIS Map'}
        </b>

        <div className="muted">
          Real MapTiler basemap · PATKAI overlays
          refresh every 15 seconds
        </div>

        <div className="map-controls">
          {Object.entries(layers).map(
            ([key, visible]) => (
              <button
                key={key}
                className={`map-toggle ${
                  visible ? 'selected' : ''
                }`}
                onClick={() =>
                  setLayers((current) => ({
                    ...current,
                    [key]: !visible,
                  }))
                }
              >
                {key === 'risk'
                  ? 'Risk Zones'
                  : key === 'roads'
                  ? 'Road Status'
                  : key === 'places'
                  ? 'Shelters & Services'
                  : 'Reports'}
              </button>
            )
          )}
        </div>
      </div>

      <div className="map-legend">
        <b>Risk</b>

        <span>
          <i
            style={{
              background:
                riskColors.CRITICAL,
            }}
          />
          Critical
        </span>

        <span>
          <i
            style={{
              background: riskColors.HIGH,
            }}
          />
          High
        </span>

        <span>
          <i
            style={{
              background:
                riskColors.MODERATE,
            }}
          />
          Moderate
        </span>

        <span>
          <i
            style={{
              background: riskColors.LOW,
            }}
          />
          Low
        </span>
      </div>

      {selected && (
        <div className="map-popup">
          <button
            className="popup-close"
            onClick={() =>
              setSelected(null)
            }
          >
            ×
          </button>

          {selected.risk_score !== undefined ? (
            <>
              <b>
                {selected.name ||
                  'Risk Zone'}
              </b>

              <div className="muted">
                {selected.district &&
                  `${selected.district}, `}
                {selected.state}
              </div>

              <div className="popup-risk">
                {selected.risk_score}
                <small>/100</small>
              </div>

              <span
                className={`badge badge-${String(
                  selected.risk_level || ''
                ).toLowerCase()}`}
              >
                {selected.risk_level ||
                  'UNKNOWN'}
              </span>

              <p>
                Confidence:{' '}
                {selected.confidence !==
                undefined
                  ? `${Math.round(
                      Number(
                        selected.confidence
                      ) * 100
                    )}%`
                  : 'N/A'}
              </p>

              {selected.trend && (
                <p>
                  Trend:{' '}
                  <b>{selected.trend}</b>
                </p>
              )}

              {selected.population_exposure !==
                undefined && (
                <p>
                  Population exposure:{' '}
                  <b>
                    {Number(
                      selected.population_exposure
                    ).toLocaleString()}
                  </b>
                </p>
              )}
            </>
          ) : selected.route_number ? (
            <>
              <b>
                {selected.name ||
                  'Road'}
              </b>

              <p>
                {selected.route_number}
                {selected.district &&
                  ` · ${selected.district}`}
              </p>

              <span className="badge">
                {selected.status ||
                  'UNKNOWN'}
              </span>

              {selected.risk !==
                undefined && (
                <p>
                  Risk:{' '}
                  <b>
                    {selected.risk}/100
                  </b>
                </p>
              )}

              {selected.impact && (
                <p>
                  {selected.impact}
                </p>
              )}
            </>
          ) : selected.kind ? (
            <>
              <b>
                {selected.name ||
                  'Emergency Facility'}
              </b>

              <p>
                {placeLabels[
                  selected.kind
                ] ||
                  selected.kind}

                {selected.district &&
                  ` · ${selected.district}`}
              </p>

              {selected.status && (
                <p>
                  Status:{' '}
                  <b>
                    {selected.status}
                  </b>
                </p>
              )}

              {selected.capacity !==
                undefined && (
                <p>
                  Capacity:{' '}
                  {selected.capacity}
                </p>
              )}

              {selected.lat !==
                undefined &&
                selected.lon !==
                  undefined && (
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      flyToLocation(
                        Number(
                          selected.lat
                        ),
                        Number(
                          selected.lon
                        )
                      )
                    }
                  >
                    Center Map
                  </button>
                )}
            </>
          ) : (
            <>
              <b>
                Citizen / Field Report
              </b>

              <p>
                {selected.incident_type ||
                  'Hazard Report'}
                {selected.severity &&
                  ` · ${selected.severity}`}
              </p>

              <p>
                {selected.description ||
                  'No description provided.'}
              </p>

              {selected.verification_status && (
                <span className="badge">
                  {
                    selected.verification_status
                  }
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
