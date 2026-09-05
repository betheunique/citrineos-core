// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import React, { useEffect, useRef } from 'react';
import type { LocationDto } from '@citrineos/types';
import { useTheme } from 'next-themes';
import { useLocale } from 'next-intl';
import config from '@lib/utils/config';
import { getTileTokenAction } from '@lib/server/actions/map/getTileTokenAction';
import { buildVoltuStyle, cssVar, tileTransformRequest } from '@lib/utils/mapStyle';
import { MapErrorBoundary } from '@lib/client/components/map/map.error-boundary';
import { Skeleton } from '@lib/client/components/ui/skeleton';

const SRC = 'locations';
const TOKEN_REFRESH_MS = 45 * 60 * 1000;
// India bounding box (SW, NE) — the default national view.
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.0, 6.5],
  [97.5, 37.5],
];

type LocationStatus = 'online' | 'offline' | 'partial';

function statusOf(location: LocationDto): LocationStatus {
  const pool = location.chargingPool ?? [];
  if (pool.length === 0) return 'offline';
  const online = pool.filter((s: { isOnline?: boolean }) => s.isOnline).length;
  if (online === pool.length) return 'online';
  if (online === 0) return 'offline';
  return 'partial';
}

function toFeatureCollection(locations: LocationDto[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: locations
      .filter((l) => l.coordinates)
      .map((l) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [l.coordinates.coordinates[0], l.coordinates.coordinates[1]],
        },
        properties: { id: String(l.id), status: statusOf(l) },
      })),
  };
}

function addLayers(map: maplibregl.Map, data: GeoJSON.FeatureCollection<GeoJSON.Point>) {
  const online = cssVar('--primary', '#0E7C68');
  const partial = '#E9861A';
  const offline = '#8A8A8A';

  map.addSource(SRC, { type: 'geojson', data, cluster: true, clusterRadius: 50, clusterMaxZoom: 12 });

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: SRC,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': online,
      'circle-opacity': 0.85,
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: SRC,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['HankenGrotesk'], // only the brand fonts exist on our glyph bucket
      'text-size': 12,
    },
    paint: { 'text-color': '#ffffff' },
  });
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: SRC,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['match', ['get', 'status'], 'online', online, 'partial', partial, offline],
      'circle-radius': 7,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  map.on('click', 'clusters', (e) => {
    const feature = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
    const clusterId = feature?.properties?.cluster_id;
    const source = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (clusterId == null || !source) return;
    source.getClusterExpansionZoom(clusterId).then((zoom) => {
      const geom = feature.geometry as GeoJSON.Point;
      map.easeTo({ center: geom.coordinates as [number, number], zoom });
    });
  });
  map.on('click', 'unclustered-point', (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const geom = f.geometry as GeoJSON.Point;
    const id = f.properties?.id as string;
    new maplibregl.Popup({ closeButton: true })
      .setLngLat(geom.coordinates as [number, number])
      .setHTML(`<a href="/locations/${id}" style="font:13px sans-serif">View location ${id}</a>`)
      .addTo(map);
  });
  for (const layer of ['clusters', 'unclustered-point']) {
    map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
  }

  // Show the whole country by default (national overview) rather than zooming into wherever the stations
  // happen to cluster — otherwise part of India (e.g. the west) sits outside the viewport until you zoom out.
  map.fitBounds(INDIA_BOUNDS, { padding: 24, duration: 0 });
}

const MapInner = ({ locations }: { locations: LocationDto[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const tokenRef = useRef<string>('');
  // Always hold the freshest locations so the async 'load' handler never draws a stale/empty set.
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let refresh: ReturnType<typeof setInterval> | undefined;

    (async () => {
      const res = await getTileTokenAction();
      if (cancelled || !containerRef.current) return;
      tokenRef.current = res.success ? res.data : '';

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: buildVoltuStyle(mode),
        center: [config.defaultMapCenterLongitude, config.defaultMapCenterLatitude],
        zoom: 4,
        transformRequest: tileTransformRequest(() => tokenRef.current),
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => {
        if (!map.getSource(SRC)) addLayers(map, toFeatureCollection(locationsRef.current));
      });
      mapRef.current = map;

      refresh = setInterval(async () => {
        const r = await getTileTokenAction();
        if (r.success) tokenRef.current = r.data;
      }, TOKEN_REFRESH_MS);
    })();

    return () => {
      cancelled = true;
      if (refresh) clearInterval(refresh);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the clustered data when locations change — apply immediately if the source exists, otherwise the
  // 'load' handler (above) will draw the freshest set via locationsRef.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(toFeatureCollection(locations));
    else map.once('load', () => {
      const s = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (s) s.setData(toFeatureCollection(locationsRef.current));
    });
  }, [locations]);

  return <div ref={containerRef} className="size-full" />;
};

export const LocationMapV2 = ({ locations }: { locations: LocationDto[] }) => {
  const locale = useLocale();
  return (
    <div className="size-full">
      <MapErrorBoundary resetKeys={[locale]} fallback={<Skeleton className="size-full" />}>
        <MapInner locations={locations.filter((location) => location.coordinates)} />
      </MapErrorBoundary>
    </div>
  );
};
